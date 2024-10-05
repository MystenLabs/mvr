mod commands;
use commands::App;
pub use commands::Command;
pub use commands::CommandOutput;

pub mod helpers;

use anyhow::{anyhow, bail, Context, Result};
use helpers::sui::force_build;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value as JValue;
use std::collections::{HashMap, HashSet};
use std::env;
use std::fmt;
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use tempfile::TempDir;
use toml_edit::{
    value, Array, ArrayOfTables, DocumentMut, Formatted, InlineTable, Item, Table, Value,
};
use url::Url;
use yansi::Paint;

use sui_config::{sui_config_dir, SUI_CLIENT_CONFIG};
use sui_sdk::{
    rpc_types::{SuiData, SuiObjectDataOptions, SuiObjectResponse},
    types::{base_types::ObjectID, dynamic_field::DynamicFieldName},
    wallet_context::WalletContext,
    SuiClient, SuiClientBuilder,
};

const RESOLVER_PREFIX_KEY: &str = "r";
const MVR_RESOLVER_KEY: &str = "mvr";
const NETWORK_KEY: &str = "network";

const APP_REGISTRY_TABLE_ID: &str =
    "0xa39ea313f15d2b4117812fcf621991c76e0264e09c41b2fed504dd67053df163";

/// RPC endpoint
pub const SUI_MAINNET_URL: &str = "https://fullnode.mainnet.sui.io:443";

/// GQL endpoints
const TESTNET_GQL: &str = "https://sui-testnet.mystenlabs.com/graphql";
const MAINNET_GQL: &str = "https://sui-mainnet.mystenlabs.com/graphql";

const TESTNET_CHAIN_ID: &str = "4c78adac";
const MAINNET_CHAIN_ID: &str = "35834a8a";

#[derive(Debug, Deserialize, Serialize)]
struct MoveRegistryDependency {
    network: String,
    packages: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct RConfig {
    network: String,
}

#[derive(Serialize, PartialEq)]
pub enum PackageInfoNetwork {
    Mainnet,
    Testnet,
}

#[derive(Serialize, Debug)]
pub struct PackageInfo {
    pub upgrade_cap_id: ObjectID,
    pub package_address: ObjectID,
    pub git_versioning: HashMap<u64, GitInfo>,
}

#[derive(Serialize, Debug)]
pub struct GitInfo {
    pub repository: String,
    pub tag: String,
    pub path: String,
}

impl fmt::Display for PackageInfoNetwork {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PackageInfoNetwork::Mainnet => write!(f, "mainnet"),
            PackageInfoNetwork::Testnet => write!(f, "testnet"),
        }
    }
}

impl fmt::Display for PackageInfo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "      Upgrade Cap ID: {}", self.upgrade_cap_id)?;
        writeln!(f, "      Package Address: {}", self.package_address)?;
        write!(f, "      Git Versioning: {:?}", self.git_versioning)
    }
}

fn find_mvr_package(value: &toml::Value) -> Option<String> {
    value
        .as_table()
        .and_then(|table| table.get(RESOLVER_PREFIX_KEY))
        .and_then(|r| r.as_table())
        .and_then(|r_table| r_table.get(MVR_RESOLVER_KEY))
        .and_then(|mvr| mvr.as_str())
        .map(String::from)
}

/// Parse out packages with the following structure:
///
/// [dependencies]
/// mvr = { r.mvr = "@mvr-tst/first-app" }
///
/// ...
///
/// [r.mvr]
/// network = "mainnet"
fn parse_move_toml(content: &str) -> Result<MoveRegistryDependency> {
    use toml::Value;
    let toml_value: Value = toml::from_str(content)?;

    // Get the network from the [r.mvr] section
    let network = toml_value
        .get(RESOLVER_PREFIX_KEY)
        .and_then(|r| r.get(MVR_RESOLVER_KEY))
        .and_then(|mvr| mvr.get(NETWORK_KEY))
        .and_then(|n| n.as_str())
        .ok_or_else(|| anyhow!("Expected [r.mvr].network to be a string"))?
        .to_string();

    let mut packages = Vec::new();
    if let Some(dependencies) = toml_value.get("dependencies").and_then(|d| d.as_table()) {
        for (_, dep_value) in dependencies {
            if let Some(package) = find_mvr_package(dep_value) {
                packages.push(package);
            }
        }
    }

    Ok(MoveRegistryDependency { network, packages })
}

/// Resolves move registry packages. This function is invoked by `sui move build` and given the
/// a key associated with the external resolution in a Move.toml file. For example, this
/// TOML would trigger sui move build to call this binary and hit this function with value `mvr`:
///
/// mvr = { r.mvr = "@mvr-tst/first-app" }
///
/// The high-level logic of this function is as follows:
/// 1) Fetch on-chain data for `packages`: the GitHub repository, branch, and subpath
/// 2) Fetches the package dependency graph from the package source (e.g., from GitHub).
/// 3) Constructs the dependency graph represented in the `Move.lock` format and emits it
///    for each package, allow the `sui move build` command to resolve packages from GitHub.
pub async fn resolve_move_dependencies(key: &str) -> Result<()> {
    let content = fs::read_to_string("Move.toml")?;
    let dependency: MoveRegistryDependency = parse_move_toml(&content)?;
    eprintln!(
        "Resolving key = '{}', packages = {:?}",
        key, dependency.packages
    );
    let network = match dependency.network.as_str() {
        "testnet" => &PackageInfoNetwork::Testnet,
        "mainnet" => &PackageInfoNetwork::Mainnet,
        _ => bail!(
            "Unrecognized network {} specified in resolver {key}",
            dependency.network
        ),
    };

    let config_path = sui_config_dir()?.join(SUI_CLIENT_CONFIG);
    let context = WalletContext::new(&config_path, None, None)?;
    let client = context.get_client().await?;
    let client_chain = client.read_api().get_chain_identifier().await.ok();
    let (mainnet_client, testnet_client) = setup_sui_clients().await?;
    let client = match (client_chain, network) {
        (Some(chain_id), PackageInfoNetwork::Testnet) if chain_id == TESTNET_CHAIN_ID => {
            &testnet_client
        }
        (Some(chain_id), PackageInfoNetwork::Mainnet) if chain_id == MAINNET_CHAIN_ID => {
            &mainnet_client
        }
        (Some(chain_id), _) => {
            let env_network = if chain_id == TESTNET_CHAIN_ID {
                "the testnet network"
            } else if chain_id == MAINNET_CHAIN_ID {
                "the mainnet network"
            } else {
                "an unknown network"
            };
            let message = format!(
                "Network mismatch: The package resolver says it is using packages from {} but \
                 your environment is using {env_network}.\n\
                 Consider either:\n\
                 - Changing your environment to match the network expected by packages (with `sui client switch --env`); OR\n\
                 - Changing the network for the resolver {key} in your `Move.toml` to match your environment \
                 (either \"testnet\" or \"mainnet\")",
                dependency.network);
            bail!(message)
        }
        _ => {
            let message = "Unrecognized chain: expected environment to be either `testnet` or `mainnet`.\n\
                 Consider switching your sui client to an environment that uses one of these chains\n\
                 For example: `sui client switch --env testnet`".to_string();
            bail!(message);
        }
    };

    let resolved_packages =
        resolve_on_chain_package_info(&mainnet_client, client, network, &dependency).await?;
    let temp_dir = TempDir::new().context("Failed to create temporary directory")?;
    let mut fetched_files: HashMap<String, (PathBuf, PathBuf)> = HashMap::new();

    for (name_with_version, package_info) in &resolved_packages {
        let (key, value) = fetch_package_files(name_with_version, package_info, &temp_dir).await?;
        fetched_files.insert(key, value);
    }

    check_address_consistency(&resolved_packages, network, &fetched_files).await?;
    let lock_files = build_lock_files(&resolved_packages, &fetched_files).await?;

    // Output each lock file content separated by null characters
    for (i, content) in lock_files.iter().enumerate() {
        io::stdout().write_all(content.as_bytes())?;

        // Add null character separator, except after the last element
        if i < lock_files.len() - 1 {
            io::stdout().write_all(&[0])?;
        }
    }

    Ok(())
}

/// Returns the mvr name and associated (Move.toml, Move.lock) files
/// downloaded from the specified on-chain info.
async fn fetch_package_files(
    name_with_version: &str,
    package_info: &PackageInfo,
    temp_dir: &TempDir,
) -> Result<(String, (PathBuf, PathBuf))> {
    let (name, version) = parse_package_version(name_with_version)?;
    let version = match version {
        Some(v) => v,
        None => package_info
            .git_versioning
            .keys()
            .max()
            .copied()
            .ok_or_else(|| {
                anyhow!("No version specified and no versions found in git_versioning")
            })?,
    };

    let git_info = package_info.git_versioning.get(&version).ok_or_else(|| {
        anyhow!(
            "version {version} of {name} does not exist in on-chain PackageInfo. \
             Please check that it is valid and try again."
        )
    })?;

    let (move_toml_path, move_lock_path) = fetch_move_files(&name, git_info, temp_dir).await?;
    Ok((
        name_with_version.to_string(),
        (move_toml_path, move_lock_path),
    ))
}

/// Resolves PackageInfo for packages on the respective chain (mainnet or testnet).
/// Registry info (IDs associated with name on `mainnet` or `testnet`) is always resolved
/// from mainnet.
async fn resolve_on_chain_package_info(
    mainnet_client: &SuiClient,
    client: &SuiClient,
    network: &PackageInfoNetwork,
    dependency: &MoveRegistryDependency,
) -> Result<HashMap<String, PackageInfo>> {
    let app_registry_id = ObjectID::from_hex_literal(APP_REGISTRY_TABLE_ID)?;
    let package_name_map: Result<HashMap<String, String>> = dependency
        .packages
        .iter()
        .map(|package| parse_package_version(package).map(|(name, _)| (name, package.clone())))
        .collect();
    let package_name_map = package_name_map?;
    // Create set of package names with version stripped (we check version info later).
    let package_set: HashSet<String> = package_name_map.keys().cloned().collect();
    let mut cursor = None;
    let mut resolved_packages: HashMap<String, PackageInfo> = HashMap::new();
    loop {
        let dynamic_fields = mainnet_client
            .read_api()
            .get_dynamic_fields(app_registry_id, cursor, None)
            .await?;

        for dynamic_field_info in dynamic_fields.data.into_iter() {
            let name_object =
                get_dynamic_field_object(mainnet_client, app_registry_id, &dynamic_field_info.name)
                    .await?;
            let name = get_normalized_app_name(&name_object)?;
            if package_set.contains(&name) {
                if let Some(package_info) = get_package_info(&name_object, client, network).await? {
                    if let Some(full_name) = package_name_map.get(&name) {
                        resolved_packages.insert(full_name.clone(), package_info);
                    } else {
                        // Invariant: should never happen: package_set and package_name_map are set up in sync
                        eprintln!("Warning: Found package in set but not in map: {}", name);
                    }
                } else {
                    bail!("No on-chain PackageInfo for package {name} on {} (it may not be registered).", dependency.network);
                }
            }
        }

        if !dynamic_fields.has_next_page {
            break;
        }
        cursor = dynamic_fields.next_cursor;
    }

    let resolved_on_chain: HashSet<String> = resolved_packages.keys().cloned().collect();
    let expected_locally: HashSet<String> = package_name_map.values().cloned().collect();
    let unresolved = &expected_locally - &resolved_on_chain;
    if !unresolved.is_empty() {
        // Emit one unresolved dependency
        bail!(
            "Could not resolve dependency {} on chain {network}. \
             It may not exist, please check and try again.",
            dependency.packages[0], // Invariant: guaranteed by construction.
        )
    }
    Ok(resolved_packages)
}

pub async fn check_address_consistency(
    resolved_packages: &HashMap<String, PackageInfo>,
    network: &PackageInfoNetwork,
    fetched_files: &HashMap<String, (PathBuf, PathBuf)>,
) -> Result<()> {
    for (name_with_version, package_info) in resolved_packages {
        check_single_package_consistency(name_with_version, package_info, network, fetched_files)
            .await?;
    }
    Ok(())
}

async fn check_single_package_consistency(
    name_with_version: &str,
    package_info: &PackageInfo,
    network: &PackageInfoNetwork,
    fetched_files: &HashMap<String, (PathBuf, PathBuf)>,
) -> Result<Option<String>> {
    let (name, version) = parse_package_version(name_with_version)?;
    // Use version or default to the highest (i.e., latest) version number otherwise.
    let version = match version {
        Some(v) => v,
        None => package_info
            .git_versioning
            .keys()
            .max()
            .copied()
            .ok_or_else(|| {
                anyhow!("No version specified and no versions found in git_versioning")
            })?,
    };
    eprintln!("Using on-chain version {version}");

    let original_address_on_chain = if version > 1 {
        package_at_version(&package_info.package_address.to_string(), 1, network)
            .await?
            .ok_or_else(|| {
                anyhow::anyhow!("Failed to retrieve original package address at version 1")
            })?
    } else {
        package_info.package_address
    };

    let git_info = package_info.git_versioning.get(&version).ok_or_else(|| {
        anyhow!(
            "version {version} of {name} does not exist in on-chain PackageInfo. \
             Please check that it is valid and try again."
        )
    })?;

    let (move_toml_path, move_lock_path) =
        fetched_files.get(name_with_version).ok_or_else(|| {
            anyhow!(
                "Failed to find fetched files `Move.toml` and \
                 `Move.lock when checking address consistency for {}",
                name_with_version
            )
        })?;
    let move_toml_content = fs::read_to_string(move_toml_path)?;
    let move_lock_content = fs::read_to_string(move_lock_path)?;

    // The `published-at` address or package in the [addresses] section _may_ correspond to
    // the original ID in the Move.toml (we will check).
    let (address, published_at, package_name) =
        get_published_ids(&move_toml_content, &original_address_on_chain).await;
    let target_chain_id = match network {
        PackageInfoNetwork::Mainnet => MAINNET_CHAIN_ID,
        PackageInfoNetwork::Testnet => TESTNET_CHAIN_ID,
    };
    let address = address
        .map(|id_str| {
            ObjectID::from_hex_literal(&id_str).map_err(|e| {
                anyhow!(
                    "Failed to parse address in [addresses] section of Move.toml: {}",
                    e
                )
            })
        })
        .transpose()?;
    let published_at = published_at
        .map(|id_str| {
            ObjectID::from_hex_literal(&id_str)
                .map_err(|e| anyhow!("Failed to parse published-at address of Move.toml: {}", e))
        })
        .transpose()?;

    // The original-published-id may exist in the Move.lock
    let original_published_id_in_lock =
        get_original_published_id(&move_lock_content, target_chain_id)
            .map(|id_str| {
                ObjectID::from_hex_literal(&id_str).map_err(|e| {
                    anyhow!("Failed to parse original-published-id in Move.lock: {}", e)
                })
            })
            .transpose()?;

    let (original_source_id, provenance): (ObjectID, String) = match (
        original_published_id_in_lock,
        published_at,
        address,
    ) {
        (Some(id), _, _) => (id, "Move.lock".into()), // precedence is given to resolving an ID from the lock
        (None, Some(published_at_id), None) => {
            // We couldn't find a published ID from [addresses] (it doesn't exist, or does not have a name
            // to reliably identify it by).
            // Our best guess is that the published-id refers to the original package (it may not, but
            // if it doesn't, there is nowhere else to look in this case).
            (
                published_at_id,
                "published-at address in the Move.toml".into(),
            )
        }
        (None, Some(published_at_id), Some(address_id))
            if address_id == ObjectID::ZERO || published_at_id == address_id =>
        {
            // The [addresses] section has a package name set to "0x0" or the same as the published_at_id.
            // Our best guess is that the published-id refers to the original package (it may not, but
            // if it doesn't, there is nowhere else to look in this case).
            (
                published_at_id,
                "published-at address in the Move.toml".into(),
            )
        }
        (None, _, Some(address_id)) => {
            // A published-at ID may or may not exist. In either case, it differs from the
            // address ID. The address ID that may refer to the original package (e.g., if the
            // package was upgraded).
            // Our best guess is that the id in the [addresses] section refers to the original ID.
            // It may be "0x0" or the original ID.
            (
                address_id,
                "address in the [addresses] section of the Move.toml".into(),
            )
        }
        _ => {
            bail!(
                "Unable to find the original published address in package {name}'s \
                 repository {} branch {} subdirectory {}. For predictable detection, see documentation\
                 on Automated Address Management for recording published addresses in the `Move.lock` file.",
                git_info.repository,
                git_info.tag,
                git_info.path
            )
        }
    };

    // Main consistency check: The on-chain package address should correspond to the original ID in the source package.
    if original_address_on_chain != original_source_id {
        bail!(
            "Mismatch: The original package address for {name} on {network} is {original_address_on_chain}, \
             but the {provenance} in {name}'s repository was found to be {original_source_id}.\n\
             Check the configuration of the package's repository {} in branch {} in subdirectory {}",
            git_info.repository,
            git_info.tag,
            git_info.path
        )
    }

    Ok(package_name)
}

async fn get_published_ids(
    move_toml_content: &str,
    _original_address_on_chain: &ObjectID,
) -> (Option<String>, Option<String>, Option<String>) {
    let doc = match move_toml_content.parse::<DocumentMut>() {
        Ok(d) => d,
        Err(_) => return (None, None, None),
    };

    let package_table = match doc.get("package").and_then(|p| p.as_table()) {
        Some(t) => t,
        None => return (None, None, None),
    };

    // Get published-at
    let published_at = package_table
        .get("published-at")
        .and_then(|value| value.as_str())
        .map(String::from);

    // Get the addresses table
    let addresses = match doc.get("addresses").and_then(|a| a.as_table()) {
        Some(a) => a,
        None => return (None, published_at, None),
    };

    // Find a potential original published ID in the addresses section.
    // In general we can't identify which entry in `[addresses]` correspond
    // to this package solely from the `Move.toml` unless we compile and parse
    // it out of a compiled module (we are not going to do that).
    //
    // We can determine if such an original published ID exists with high
    // likelihood by:
    // (1) Identifying a package set to `0x0`, which likely refers to the package itself; OR
    // (2) Identifying an entry where they key corresponds to the lowercase string
    //     of the package name. This is a heuristic based on the convention generally
    //     followed in Move.toml, but not guaranteed.
    //
    // If the Move.toml contents thwart all these attempts at identifying the original
    // package ID, the package is better off adopting Automated Address Management for
    // predictable detection, and the caller can raise an error.
    let (address, name) = {
        // First, check if any address is set to "0x0"
        let package_with_zero_address = addresses
            .iter()
            .find(|(_, v)| v.as_str() == Some("0x0"))
            .map(|(k, _)| k.to_string());

        match package_with_zero_address {
            Some(_) => (Some("0x0".into()), package_with_zero_address),
            None => {
                let package_name = package_table
                    .get("name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_lowercase());

                (
                    package_name.clone().and_then(|name| {
                        addresses
                            .get(&name)
                            .and_then(|v| v.as_str())
                            .map(String::from)
                    }),
                    package_name, // TODO: use the addresses name based on original_address (?)
                )
            }
        }
    };

    (address, published_at, name)
}

fn get_original_published_id(move_toml_content: &str, target_chain_id: &str) -> Option<String> {
    let doc = move_toml_content.parse::<DocumentMut>().ok()?;
    let original_published_id = doc
        .get("env")?
        .as_table()?
        .iter()
        .filter_map(|(_, value)| value.as_table())
        .find(|table| {
            table
                .get("chain-id")
                .and_then(|v| v.as_str())
                .map_or(false, |id| id == target_chain_id)
        })
        .and_then(|table| {
            table
                .get("original-published-id")
                .and_then(|v| v.as_str())
                .map(String::from)
        });
    original_published_id
}

/// Constructs the dependency graphs for packages, represented in the `Move.lock` format.
/// For a given package `foo`, it fetches `foo`'s `Move.lock` in a source repository.
/// This `Move.lock` contains the transitive dependency graph of `foo`, but not `foo` itself.
/// Since we want to communicate `foo` (and the URL where it can be found) to `sui move build`,
/// we create a dependency graph in the `Move.lock` derived from `foo`'s original lock file
/// that contains `foo`. See `insert_root_dependency` for how this works.
pub async fn build_lock_files(
    resolved_packages: &HashMap<String, PackageInfo>,
    fetched_files: &HashMap<String, (PathBuf, PathBuf)>,
) -> Result<Vec<String>> {
    let mut lock_files: Vec<String> = vec![];

    for (name_with_version, package_info) in resolved_packages {
        let (_name, version) = parse_package_version(name_with_version)?;
        // Use version or default to the highest (i.e., latest) version number otherwise.
        let version = match version {
            Some(v) => v,
            None => package_info
                .git_versioning
                .keys()
                .max()
                .copied()
                .ok_or_else(|| {
                    anyhow!("No version specified and no versions found in git_versioning")
                })?,
        };

        let git_info = package_info
            .git_versioning
            .get(&version)
            .ok_or_else(|| anyhow!("version {version} does not exist in on-chain PackageInfo"))?;

        let (move_toml_path, move_lock_path) =
            fetched_files.get(name_with_version).ok_or_else(|| {
                anyhow!(
                    "Failed to find fetched files `Move.toml` and `Move.lock` when building package graph for {}",
                    name_with_version
                )
            })?;
        let move_toml_content = fs::read_to_string(move_toml_path)?;
        let move_lock_content = fs::read_to_string(move_lock_path)?;
        let root_name_from_source = parse_source_package_name(&move_toml_content)?;
        let lock_with_root =
            insert_root_dependency(&move_lock_content, &root_name_from_source, git_info)?;
        lock_files.push(lock_with_root);
    }

    Ok(lock_files)
}

async fn setup_sui_clients() -> Result<(SuiClient, SuiClient)> {
    let mainnet_client = SuiClientBuilder::default().build(SUI_MAINNET_URL).await?;
    let testnet_client = SuiClientBuilder::default().build_testnet().await?;
    Ok((mainnet_client, testnet_client))
}

async fn get_dynamic_field_object(
    client: &SuiClient,
    parent_object_id: ObjectID,
    name: &DynamicFieldName,
) -> Result<SuiObjectResponse> {
    client
        .read_api()
        .get_dynamic_field_object(parent_object_id, name.clone())
        .await
        .map_err(|e| anyhow!("{e}"))
}

fn get_normalized_app_name(dynamic_field_object: &SuiObjectResponse) -> Result<String> {
    let content = dynamic_field_object
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move());

    let name = content
        .and_then(|move_data| move_data.fields.field_value("name"))
        .map(|name_field| name_field.to_json_value());

    if let Some(JValue::Object(name_obj)) = name {
        let org_name = name_obj
            .get("org")
            .and_then(|org| org.as_object())
            .and_then(|org| org.get("labels"))
            .and_then(|labels| labels.as_array())
            .and_then(|labels| labels.get(1))
            .and_then(|label| label.as_str())
            .unwrap_or("unknown");

        let app_name = name_obj
            .get("app")
            .and_then(|app| app.as_array())
            .and_then(|app| app.first())
            .and_then(|app| app.as_str())
            .unwrap_or("unknown");

        Ok(format!("@{}/{}", org_name, app_name))
    } else {
        Err(anyhow!("Invalid name structure"))
    }
}

fn get_package_info_id(
    dynamic_field: &SuiObjectResponse,
    network: &PackageInfoNetwork,
) -> Result<ObjectID> {
    let json_value = dynamic_field
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_data| move_data.fields.field_value("value"))
        .map(|value| value.to_json_value())
        .ok_or_else(|| anyhow!("Failed to extract value field as JSON"))?;

    let package_info_id_str = match network {
        PackageInfoNetwork::Mainnet => json_value["app_info"]["package_info_id"]
            .as_str()
            .ok_or_else(|| anyhow!("PackageInfo ID not found for Mainnet"))?,
        PackageInfoNetwork::Testnet => {
            let networks = json_value["networks"]["contents"]
                .as_array()
                .ok_or_else(|| anyhow!("Networks is not an array"))?;

            networks
                .iter()
                .find(|entry| entry["key"] == "testnet")
                .and_then(|testnet_entry| testnet_entry["value"]["package_info_id"].as_str())
                .ok_or_else(|| anyhow!("PackageInfo ID not found for Testnet"))?
        }
    };

    ObjectID::from_hex_literal(package_info_id_str)
        .map_err(|e| anyhow!("Failed to parse PackageInfo ID: {e}"))
}

async fn get_package_info(
    name_object: &SuiObjectResponse,
    client: &SuiClient,
    network: &PackageInfoNetwork,
) -> Result<Option<PackageInfo>> {
    let package_info_id = get_package_info_id(name_object, network)?;
    let package_info = get_package_info_by_id(client, package_info_id).await?;
    let upgrade_cap_id = get_upgrade_cap_id(&package_info)?;
    let package_address = get_package_address(&package_info)?;
    let git_versioning = get_git_versioning(&package_info, client).await?;
    Ok(Some(PackageInfo {
        upgrade_cap_id,
        package_address,
        git_versioning,
    }))
}

fn get_upgrade_cap_id(package_info: &SuiObjectResponse) -> Result<ObjectID> {
    let id_str = package_info
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_data| move_data.fields.field_value("upgrade_cap_id"))
        .map(|id| id.to_string())
        .ok_or_else(|| anyhow!("Expected upgrade_cap_id field"))?;

    ObjectID::from_hex_literal(&id_str)
        .map_err(|e| anyhow!("Failed to PackageInfo Upgrade Cap ID: {e}"))
}

fn get_package_address(package_info: &SuiObjectResponse) -> Result<ObjectID> {
    let id_str = package_info
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_data| move_data.fields.field_value("package_address"))
        .map(|id| id.to_string())
        .ok_or_else(|| anyhow!("Expected package_address field"))?;

    ObjectID::from_hex_literal(&id_str)
        .map_err(|e| anyhow!("Failed to PackageInfo Package Address: {e}"))
}

async fn get_git_versioning(
    package_info: &SuiObjectResponse,
    client: &SuiClient,
) -> Result<HashMap<u64, GitInfo>> {
    let git_versioning_id = get_git_versioning_id(package_info)?;
    let mut result = HashMap::new();
    let mut cursor = None;

    loop {
        let dynamic_fields = client
            .read_api()
            .get_dynamic_fields(git_versioning_id, cursor, None)
            .await?;

        for dynamic_field_info in dynamic_fields.data.iter() {
            let index = extract_index(&dynamic_field_info.name)?;
            let dynamic_field_data = client
                .read_api()
                .get_dynamic_field_object(git_versioning_id, dynamic_field_info.name.clone())
                .await?;
            let git_info = extract_git_info(&dynamic_field_data)?;
            result.insert(index, git_info);
        }

        if !dynamic_fields.has_next_page {
            break;
        }

        cursor = dynamic_fields.next_cursor;
    }
    Ok(result)
}

async fn get_package_info_by_id(
    client: &SuiClient,
    package_info_id: ObjectID,
) -> Result<SuiObjectResponse> {
    client
        .read_api()
        .get_object_with_options(package_info_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|e| anyhow!("No package info: {e}"))
}

fn get_git_versioning_id(package_info: &SuiObjectResponse) -> Result<ObjectID> {
    let json_value = package_info
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_object| move_object.fields.field_value("git_versioning"))
        .map(|git_versioning| git_versioning.to_json_value())
        .ok_or_else(|| anyhow!("No git_versioning field"))?;

    let id_str = json_value["id"]["id"]
        .as_str()
        .ok_or_else(|| anyhow!("Expected git_versioning string"))?;

    ObjectID::from_hex_literal(id_str).map_err(|e| anyhow!("Invalid git versioning ID: {e}"))
}

async fn package_at_version(
    address: &str,
    version: u64,
    network: &PackageInfoNetwork,
) -> Result<Option<ObjectID>> {
    let endpoint = match network {
        PackageInfoNetwork::Mainnet => MAINNET_GQL,
        PackageInfoNetwork::Testnet => TESTNET_GQL,
    };
    let client = reqwest::Client::new();
    let query = format!(
        r#"{{
            package(address: "{}") {{
                packageAtVersion(version: {}) {{
                    address
                }}
            }}
        }}"#,
        address, version
    );

    let response = client
        .post(endpoint)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&serde_json::json!({
            "query": query
        }))
        .send()
        .await?;
    let body: JValue = response.json().await?;
    let result = body["data"]["package"]["packageAtVersion"]["address"]
        .as_str()
        .map(String::from);
    let result = result
        .map(|id_str| {
            ObjectID::from_hex_literal(&id_str).map_err(|e| {
                anyhow!(
                    "Failed to parse package address for packageAtVersion GQL request: {}",
                    e
                )
            })
        })
        .transpose()?;
    Ok(result)
}

fn extract_index(dynamic_field_name: &DynamicFieldName) -> Result<u64> {
    match &dynamic_field_name.value {
        JValue::String(s) => s
            .parse::<u64>()
            .map_err(|e| anyhow!("Failed to parse index: {}", e)),
        JValue::Number(n) => n.as_u64().ok_or_else(|| anyhow!("Index is not a u64")),
        _ => Err(anyhow!("Unexpected index type")),
    }
}

fn extract_git_info(dynamic_field_data: &SuiObjectResponse) -> Result<GitInfo> {
    let git_info = dynamic_field_data
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_object| move_object.fields.field_value("value"))
        .ok_or_else(|| anyhow!("Failed to extract git info"))?
        .to_json_value();

    let repository = git_info["repository"]
        .as_str()
        .ok_or_else(|| anyhow!("No repository field"))?
        .to_string();
    let tag = git_info["tag"]
        .as_str()
        .ok_or_else(|| anyhow!("No tag field"))?
        .to_string();
    let path = git_info["path"]
        .as_str()
        .ok_or_else(|| anyhow!("No path field"))?
        .to_string();

    Ok(GitInfo {
        repository,
        tag,
        path,
    })
}

/// Given a normalized Move Registry package name, split out the version number (if any).
pub fn parse_package_version(name: &str) -> anyhow::Result<(String, Option<u64>)> {
    let parts: Vec<&str> = name.split('/').collect();
    match parts.as_slice() {
        [base_org, base_name] => Ok((
            format!("{}/{}", base_org, base_name),
            None,
        )),
        [base_org, base_name, version] => {
            let version: u64 = version
                .parse::<u64>()
                .map_err(|_| {
                    anyhow!("Cannot parse version \"{version}\". Version must be 1 or greater.")
                })
                .and_then(|v| {
                    if v >= 1 {
                        Ok(v)
                    } else {
                        Err(anyhow!(
                            "Invalid version number {v}. Version must be 1 or greater."
                        ))
                    }
                })?;
            Ok((
                format!("{}/{}", base_org, base_name),
                Some(version),
            ))
        }
        _ => Err(anyhow!(
            "Invalid package name format when parsing version: {name}"
        )),
    }
}

fn format_github_raw_url(
    repository: &str,
    tag: &str,
    path: &str,
    file_name: &str,
) -> Result<String> {
    let repo_url = Url::parse(repository).context("Failed to parse repository URL")?;
    let path_segments: Vec<&str> = repo_url.path().trim_start_matches('/').split('/').collect();
    if path_segments.len() < 2 {
        return Err(anyhow!("Invalid repository format. Expected 'owner/repo'"));
    }
    let (owner, repo) = (path_segments[0], path_segments[1]);
    // TODO: raw.githubusercontent is perhaps not the way to go long-term (or short-term).
    Ok(format!(
        "https://raw.githubusercontent.com/{}/{}/{}/{}/{}",
        owner,
        repo,
        tag,
        path.trim_start_matches('/'),
        file_name
    ))
}

/// Fetches `Move.toml` and `Move.lock` files from a source repository.
async fn fetch_move_files(
    name: &str,
    git_info: &GitInfo,
    temp_dir: &TempDir,
) -> Result<(PathBuf, PathBuf)> {
    let client = Client::new();

    let files_to_fetch = ["Move.toml", "Move.lock"];
    let mut file_paths = Vec::new();

    for file_name in &files_to_fetch {
        let url = format_github_raw_url(
            &git_info.repository,
            &git_info.tag,
            &git_info.path,
            file_name,
        )?;

        let response = client
            .get(&url)
            .send()
            .await
            .context("Failed to send request")?;

        if !response.status().is_success() {
            match response.status().as_u16() {
                404 => {
                    return Err(anyhow!(
                    "File '{}' for package {name} does not exist in the upstream repository at {}",
                    file_name,
                    url
                ))
                }
                status => {
                    return Err(anyhow!(
                        "Failed to fetch '{}' for package {name}: HTTP status code {}",
                        file_name,
                        status
                    ))
                }
            }
        };

        let content = response
            .text()
            .await
            .context("Failed to read response content")?;
        let file_path = temp_dir.path().join(file_name);
        let mut file = File::create(&file_path).context("Failed to create file")?;
        file.write_all(content.as_bytes())
            .context("Failed to write file content")?;

        file_paths.push(file_path);
    }

    Ok((file_paths[0].clone(), file_paths[1].clone()))
}

/// For a given package `foo` and its original `Move.lock` (containing transitive dependencies),
/// we create a new graph represented in `Move.lock` such that:
/// 1) `foo` becomes the root dependency
/// 2) `foo` is added as a dependency in `packages`
/// 3) `foo`'s dependencies is set to the original `Move.lock`'s root dependencies.
fn insert_root_dependency(
    toml_content: &str,
    root_name: &str,
    git_info: &GitInfo,
) -> Result<String> {
    let mut doc = toml_content
        .parse::<DocumentMut>()
        .context("Failed to parse TOML content")?;

    let move_section = doc["move"]
        .as_table_mut()
        .ok_or_else(|| anyhow!("Failed to get [move] table"))?;

    // Save the top-level `dependencies`, which will become the dependencies of the new root package.
    let original_deps = move_section.get("dependencies").cloned();

    // Make the top-level `dependencies` point to the new root package.
    let new_dep = {
        let mut table = InlineTable::new();
        table.insert("name", Value::String(Formatted::new(root_name.to_string())));
        table.insert("id", Value::String(Formatted::new(root_name.to_string())));
        Value::InlineTable(table)
    };
    let mut new_deps = Array::new();
    new_deps.push(new_dep);
    move_section["dependencies"] = value(new_deps);

    // Create a new root package entry, set its dependencies to the original top-level dependencies, and persist.
    let mut new_package = Table::new();
    new_package.insert("id", value(root_name));

    let mut source = Table::new();
    source.insert("git", value(&git_info.repository));
    source.insert("rev", value(&git_info.tag));
    source.insert("subdir", value(&git_info.path));
    new_package.insert("source", Item::Table(source));

    if let Some(deps) = original_deps {
        new_package.insert("dependencies", deps);
    }

    let packages = move_section
        .entry("package")
        .or_insert(Item::ArrayOfTables(ArrayOfTables::new()))
        .as_array_of_tables_mut()
        .ok_or_else(|| anyhow!("Failed to get or create package array"))?;
    packages.push(new_package);
    Ok(doc.to_string())
}

fn parse_source_package_name(toml_content: &str) -> Result<String> {
    let doc = toml_content
        .parse::<DocumentMut>()
        .context("Failed to parse TOML content")?;

    let package_table = doc["package"]
        .as_table()
        .ok_or_else(|| anyhow!("Failed to find [package] table"))?;

    let name = package_table["name"]
        .as_str()
        .ok_or_else(|| anyhow!("Failed to find 'name' in [package] table"))?;

    Ok(name.to_string())
}

async fn update_mvr_packages(
    move_toml_path: &Path,
    package_name: &str,
    network: &str,
) -> Result<()> {
    let config_path = sui_config_dir()?.join(SUI_CLIENT_CONFIG);
    let context = WalletContext::new(&config_path, None, None)?;
    let (mainnet_client, testnet_client) = setup_sui_clients().await?;

    let dependency = MoveRegistryDependency {
        network: network.to_string(),
        packages: vec![package_name.to_string()],
    };
    let network = match dependency.network.as_str() {
        "testnet" => &PackageInfoNetwork::Testnet,
        "mainnet" => &PackageInfoNetwork::Mainnet,
        _ => bail!(
            "Unrecognized network {} specified for this dependency: Must be one of mainnet or testnet",
            dependency.network
        ),
    };
    let client = match network {
        PackageInfoNetwork::Testnet => &testnet_client,
        PackageInfoNetwork::Mainnet => &mainnet_client,
    };

    let resolved_packages =
        resolve_on_chain_package_info(&mainnet_client, client, network, &dependency).await?;
    let toml_content = fs::read_to_string(move_toml_path)
        .with_context(|| format!("Failed to read file: {:?}", move_toml_path))?;
    let mut doc = toml_content
        .parse::<DocumentMut>()
        .context("Failed to parse TOML content")?;

    if !doc.contains_key("dependencies") {
        doc["dependencies"] = Item::Table(Table::new());
    }
    let dependencies = doc["dependencies"].as_table_mut().unwrap();
    let mut new_dep_table = InlineTable::new();
    let mut r_table = InlineTable::new();
    r_table.set_dotted(true); // our `r.mvr` is a dotted table
    r_table.insert(
        MVR_RESOLVER_KEY,
        Value::String(Formatted::new(package_name.to_string())),
    );
    new_dep_table.insert(RESOLVER_PREFIX_KEY, Value::InlineTable(r_table));

    // Infer package name to insert.
    let temp_dir = TempDir::new().context("Failed to create temporary directory")?;
    let package_info = resolved_packages.get(package_name).unwrap(); // Invariant: must have resolved
    let (_, (dep_move_toml_path, _)) =
        fetch_package_files(package_name, package_info, &temp_dir).await?;
    let dep_move_toml_content = fs::read_to_string(dep_move_toml_path)?;
    let placeholder_address = ObjectID::from_hex_literal("0x0")?; // XXX
    let Some(name) = get_published_ids(&dep_move_toml_content, &placeholder_address)
        .await
        .2
    else {
        bail!(
            "Unable to discover a local name to give this package in your Move.toml, \
             please give this dependency an appropriate name and add it under \
             [dependencies] as follows: \
             YourName = {{ r.mvr = \"{package_name}\" }}"
        );
    };
    dependencies.insert(&name, Item::Value(Value::InlineTable(new_dep_table)));

    let network_exists = doc
        .get(RESOLVER_PREFIX_KEY)
        .and_then(|r| r.as_table())
        .and_then(|r_table| r_table.get(MVR_RESOLVER_KEY))
        .and_then(|mvr| mvr.as_table())
        .and_then(|mvr_table| mvr_table.get(NETWORK_KEY))
        .is_some();
    if network_exists {
        eprintln!("Network value already exists in r.mvr section. It will be overwritten.");
    }

    if !doc.contains_key(RESOLVER_PREFIX_KEY) {
        doc[RESOLVER_PREFIX_KEY] = Item::Table(Table::new());
    }
    let r_table = doc[RESOLVER_PREFIX_KEY].as_table_mut().unwrap();
    r_table.set_dotted(true); // expecting to create `[r.mvr]` section only
    if !r_table.contains_key(MVR_RESOLVER_KEY) {
        r_table.insert(MVR_RESOLVER_KEY, Item::Table(Table::new()));
    }
    let mvr_table = r_table[MVR_RESOLVER_KEY].as_table_mut().unwrap();
    mvr_table.insert(NETWORK_KEY, toml_edit::value(network.to_string()));
    fs::write(move_toml_path, doc.to_string())
        .with_context(|| format!("Failed to write updated TOML to file: {:?}", move_toml_path))?;

    println!(
        "{}\nYou can use this dependency in your modules by calling: {}",
        &format!(
            "\nSuccessfully added dependency {} to your Move.toml\n",
            package_name.green()
        ),
        &format!("use {}::<module>;\n", name).green()
    );
    force_build();

    Ok(())
}

/// List the App Registry
pub async fn subcommand_list() -> Result<CommandOutput> {
    let (mainnet_client, testnet_client) = setup_sui_clients().await?;
    let app_registry_id = ObjectID::from_hex_literal(APP_REGISTRY_TABLE_ID)?;
    let mut cursor = None;
    let mut output = vec![];
    loop {
        let dynamic_fields = mainnet_client
            .read_api()
            .get_dynamic_fields(app_registry_id, cursor, None)
            .await?;

        for dynamic_field_info in dynamic_fields.data.into_iter() {
            let name_object = get_dynamic_field_object(
                &mainnet_client,
                app_registry_id,
                &dynamic_field_info.name,
            )
            .await?;
            let name = get_normalized_app_name(&name_object)?;
            let app = App {
                name: name.clone(),
                package_info: vec![
                    (
                        PackageInfoNetwork::Testnet,
                        get_package_info(
                            &name_object,
                            &testnet_client,
                            &PackageInfoNetwork::Testnet,
                        )
                        .await
                        .unwrap_or(None),
                    ),
                    (
                        PackageInfoNetwork::Mainnet,
                        get_package_info(
                            &name_object,
                            &mainnet_client,
                            &PackageInfoNetwork::Mainnet,
                        )
                        .await
                        .unwrap_or(None),
                    ),
                ],
            };
            output.push(app);
        }

        if !dynamic_fields.has_next_page {
            break;
        }
        cursor = dynamic_fields.next_cursor;
    }
    Ok(CommandOutput::List(output))
}

pub async fn subcommand_add_dependency(package_name: &str, network: &str) -> Result<CommandOutput> {
    if network != "testnet" && network != "mainnet" {
        bail!("network must be one of \"testnet\" or \"mainnet\"");
    }
    let current_dir = env::current_dir().context("Failed to get current directory")?;
    let move_toml_path = current_dir.join("Move.toml");
    if !move_toml_path.exists() {
        return Err(anyhow!("Move.toml not found in the current directory"));
    }
    let cmd = update_mvr_packages(&move_toml_path, package_name, network).await;
    match cmd {
        Ok(_) => Ok(CommandOutput::Add(format!(
            "Successfully added {} to registry",
            package_name
        ))),
        Err(e) => Err(e),
    }
}

pub async fn subcommand_register_name(_name: &str) -> Result<CommandOutput> {
    println!("tbd!");
    Ok(CommandOutput::Register)
}

/// resolve a .move name to an address. E.g., `nft@sample` => 0x... cf. subcommand_list implementation.
pub async fn subcommand_resolve_name(_name: &str) -> Result<CommandOutput> {
    println!("tbd!");
    Ok(CommandOutput::Resolve)
}
