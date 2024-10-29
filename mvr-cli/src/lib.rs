mod commands;
use commands::App;
pub use commands::Command as CliCommand;
pub use commands::CommandOutput;

pub mod helpers;

use anyhow::{anyhow, bail, Context, Result};
use helpers::sui::force_build;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value as JValue;
use std::collections::{HashMap, HashSet};
use std::env;
use std::fmt;
use std::fs::{self};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::str::FromStr;
use tempfile::TempDir;
use toml_edit::{
    value, Array, ArrayOfTables, DocumentMut, Formatted, InlineTable, Item, Table, Value,
};
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
const DEPENDENCIES_KEY: &str = "dependencies";
const PUBLISHED_AT_KEY: &str = "published-at";
const ADDRESSES_KEY: &str = "addresses";

const LOCK_MOVE_KEY: &str = "move";
const LOCK_PACKAGE_KEY: &str = "package";
const LOCK_PACKAGE_NAME_KEY: &str = "name";

const APP_REGISTRY_TABLE_ID: &str =
    "0xa39ea313f15d2b4117812fcf621991c76e0264e09c41b2fed504dd67053df163";

/// RPC endpoint
pub const SUI_MAINNET_URL: &str = "https://fullnode.mainnet.sui.io:443";

/// GQL endpoints
const TESTNET_GQL: &str = "https://sui-testnet.mystenlabs.com/graphql";
const MAINNET_GQL: &str = "https://sui-mainnet.mystenlabs.com/graphql";

const TESTNET_CHAIN_ID: &str = "4c78adac";
const MAINNET_CHAIN_ID: &str = "35834a8a";

const VERSIONED_NAME_REGEX: &str = concat!(
    "^",
    r"([a-z0-9.\-@]*)",
    r"\/",
    "([a-z0-9.-]*)",
    r"(?:\/(\d+))?",
    "$"
);

static VERSIONED_NAME_REG: Lazy<Regex> = Lazy::new(|| Regex::new(VERSIONED_NAME_REGEX).unwrap());

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

struct VersionedName {
    name: String,
    version: Option<u64>,
}

#[derive(Serialize, Default, Debug)]
pub struct MoveTomlPublishedID {
    addresses_id: Option<String>,
    published_at_id: Option<String>,
    internal_pkg_name: Option<String>,
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

impl FromStr for VersionedName {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let caps = VERSIONED_NAME_REG
            .captures(s)
            .ok_or_else(|| anyhow!("Invalid name format: {}", s))?;

        let org_name = caps
            .get(1)
            .map(|x| x.as_str())
            .ok_or_else(|| anyhow!("Invalid organization name in: {}", s))?;

        let app_name = caps
            .get(2)
            .map(|x| x.as_str())
            .ok_or_else(|| anyhow!("Invalid application name in: {}", s))?;

        let version = caps
            .get(3)
            .map(|x| x.as_str().parse::<u64>())
            .transpose()
            .map_err(|_| anyhow!("Invalid version number. Version must be 1 or greater."))?;

        Ok(Self {
            name: format!("{}/{}", org_name, app_name),
            version,
        })
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
/// MyDep = { r.mvr = "@mvr-tst/first-app" }
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
        .ok_or_else(|| anyhow!("Expected [r.mvr].network to be a string".red()))?
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
/// MyDep = { r.mvr = "@mvr-tst/first-app" }
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
        "{} {}: {:?} {} {}",
        "RESOLVING".blue(),
        key.blue().bold(),
        dependency.packages.blue().bold(),
        "ON".blue(),
        dependency.network.blue().bold(),
    );
    let network = match dependency.network.as_str() {
        "testnet" => &PackageInfoNetwork::Testnet,
        "mainnet" => &PackageInfoNetwork::Mainnet,
        _ => bail!(
            "{} {} {} {}",
            "Unrecognized network".red(),
            dependency.network.red().bold(),
            "specified in resolver".red(),
            key.red().bold(),
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
                "{} {} {} {} {}",
                "Network mismatch: The package resolver says it is using packages from".red(),
                dependency.network.red().bold(),
                "but your environment is using".red(),
                env_network.red().bold(),
                ".\n\
                 Consider either:\n\
                 - Changing your environment to match the network expected by packages (with `sui client switch --env`); OR\n\
                 - Changing the network for the resolver {key} in your `Move.toml` to match your environment \
                 (either \"testnet\" or \"mainnet\")".red()
            );
            bail!(message)
        }
        _ => {
            let message = format!(
                "{}",
                "Unrecognized chain: expected environment to be either `testnet` or `mainnet`.\n\
                 Consider switching your sui client to an environment that uses one of these chains\n\
                 For example: `sui client switch --env testnet`".red()
            );
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
                anyhow!("No version specified and no versions found in git_versioning".red())
            })?,
    };

    let git_info = package_info.git_versioning.get(&version).ok_or_else(|| {
        anyhow!(
            "version {version} of {name} does not exist in on-chain PackageInfo. \
             Please check that it is valid and try again."
                .red()
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
                    bail!(
                        "{} {} {} {} {}",
                        "No on-chain PackageInfo for package".red(),
                        name.red().bold(),
                        "on".red(),
                        dependency.network.red().bold(),
                        "(it may not be registered).".red()
                    );
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
            "{} {} {} {}{}",
            "Could not resolve dependency".red(),
            dependency.packages[0].red().bold(), // Invariant: packages[0] guaranteed by construction
            "on chain".red(),
            network.red().bold(),
            ". It may not exist, please check and try again.".red(),
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
) -> Result<()> {
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
                anyhow!("No version specified and no versions found in git_versioning".red())
            })?,
    };
    eprintln!(
        "{} {} {} {}",
        "USING ON-CHAIN VERSION".blue(),
        version.blue().bold(),
        "OF".blue(),
        name_with_version.blue().bold(),
    );

    let original_address_on_chain = if version > 1 {
        package_at_version(&package_info.package_address.to_string(), 1, network)
            .await?
            .ok_or_else(|| {
                anyhow::anyhow!("Failed to retrieve original package address at version 1".red())
            })?
    } else {
        package_info.package_address
    };

    let git_info = package_info.git_versioning.get(&version).ok_or_else(|| {
        anyhow!(
            "version {version} of {name} does not exist in on-chain PackageInfo. \
             Please check that it is valid and try again."
                .red()
        )
    })?;

    let (move_toml_path, move_lock_path) =
        fetched_files.get(name_with_version).ok_or_else(|| {
            anyhow!(
                "{} {}",
                "Failed to find fetched files `Move.toml` and \
                 `Move.lock when checking address consistency for"
                    .red(),
                name_with_version.red().bold()
            )
        })?;
    let move_toml_content = fs::read_to_string(move_toml_path)?;
    let move_lock_content = fs::read_to_string(move_lock_path)?;

    // The `published-at` address or package in the [addresses] section _may_ correspond to
    // the original ID in the Move.toml (we will check).
    let MoveTomlPublishedID {
        addresses_id,
        published_at_id,
        ..
    } = get_published_ids(&move_toml_content, &original_address_on_chain).await;
    let target_chain_id = match network {
        PackageInfoNetwork::Mainnet => MAINNET_CHAIN_ID,
        PackageInfoNetwork::Testnet => TESTNET_CHAIN_ID,
    };
    let address = addresses_id
        .map(|id_str| {
            ObjectID::from_hex_literal(&id_str).map_err(|e| {
                anyhow!(
                    "{} {}",
                    "Failed to parse address in [addresses] section of Move.toml:".red(),
                    e.red()
                )
            })
        })
        .transpose()?;
    let published_at = published_at_id
        .map(|id_str| {
            ObjectID::from_hex_literal(&id_str).map_err(|e| {
                anyhow!(
                    "{} {}",
                    "Failed to parse published-at address of Move.toml:".red(),
                    e.red()
                )
            })
        })
        .transpose()?;

    // The original-published-id may exist in the Move.lock
    let original_published_id_in_lock =
        get_original_published_id(&move_lock_content, target_chain_id)
            .map(|id_str| {
                ObjectID::from_hex_literal(&id_str).map_err(|e| {
                    anyhow!(
                        "{} {}",
                        "Failed to parse original-published-id in Move.lock:".red(),
                        e.red()
                    )
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
                 repository {} branch {} subdirectory {}. For predictable detection, see documentation \
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

    Ok(())
}

/// Returns as information from the Move.toml that resovles the original published address of a
/// package, and likely internal package name based on addresses in the [addresses] section. The
/// internal package name may be assigned the "0x0" address (if automated address management is
/// used). Otherwise, it may be assigned the value of the known original_address_on_chain, which is
/// used to reverse-lookup a candidate package name in the addresses section of the Move.toml.
pub async fn get_published_ids(
    move_toml_content: &str,
    original_address_on_chain: &ObjectID,
) -> MoveTomlPublishedID {
    let doc = match move_toml_content.parse::<DocumentMut>() {
        Ok(d) => d,
        Err(_) => return MoveTomlPublishedID::default(),
    };

    let package_table = match doc.get("package").and_then(|p| p.as_table()) {
        Some(t) => t,
        None => return MoveTomlPublishedID::default(),
    };

    // Get published-at
    let published_at_id = package_table
        .get(PUBLISHED_AT_KEY)
        .and_then(|value| value.as_str())
        .map(String::from);

    // Get the addresses table
    let addresses = match doc.get(ADDRESSES_KEY).and_then(|a| a.as_table()) {
        Some(a) => a,
        None => {
            return MoveTomlPublishedID {
                published_at_id,
                ..Default::default()
            }
        }
    };

    // Find a potential original published ID in the addresses section.
    // In general we can't identify which entry in `[addresses]` correspond
    // to this package solely from the `Move.toml` unless we compile and parse
    // it out of a compiled module (we are not going to do that).
    //
    // We can determine if such an original published ID exists with high
    // likelihood by:
    // (1) Identifying a package set to the original_address_on_chain
    //     (if not using automated address management); OR
    // (2) Identifying a package set to `0x0`, which likely refers to the package itself
    //     (when using automated address management); OR
    // (3) Identifying an entry where the key corresponds to the lowercase string
    //     of the package name. This is a heuristic based on the convention generally
    //     followed in Move.toml, but not guaranteed. In practice we expect either of
    //     (1) or (2) to succeed for a published package.
    //
    // If the Move.toml contents thwart all these attempts at identifying the original
    // package ID, the package is better off adopting Automated Address Management for
    // predictable detection, and the caller can raise an error.

    // (1) First, check if any address corresponds to the original_address_on_chain
    let package_with_original_address = addresses
        .iter()
        .find(|(_, v)| v.as_str() == Some(&original_address_on_chain.to_string()))
        .map(|(k, _)| k.to_string());
    if let Some(name) = package_with_original_address {
        // (1) A package name exists that corresponds to the original address
        return MoveTomlPublishedID {
            addresses_id: Some(original_address_on_chain.to_string()),
            published_at_id,
            internal_pkg_name: Some(name),
        };
    };

    // (2) & (3) Next, check if any address is set to "0x0"
    let package_with_zero_address = addresses
        .iter()
        .find(|(_, v)| v.as_str() == Some("0x0"))
        .map(|(k, _)| k.to_string());
    match package_with_zero_address {
        // (2) We found a package set to 0x0
        Some(_) => MoveTomlPublishedID {
            addresses_id: Some("0x0".into()),
            published_at_id,
            internal_pkg_name: package_with_zero_address,
        },
        // (3) We'll return a package ID that corresponds to the lowercase package name
        // set in the Move.toml (if any).
        None => {
            let package_name = package_table
                .get("name")
                .and_then(|v| v.as_str())
                .map(|s| s.to_lowercase());
            let addresses_id = package_name.clone().and_then(|name| {
                addresses
                    .get(&name)
                    .and_then(|v| v.as_str())
                    .map(String::from)
            });
            MoveTomlPublishedID {
                addresses_id,
                published_at_id,
                internal_pkg_name: package_name,
            }
        }
    }
}

fn get_original_published_id(move_toml_content: &str, target_chain_id: &str) -> Option<String> {
    let doc = move_toml_content.parse::<DocumentMut>().ok()?;
    let table = doc
        .get("env")?
        .as_table()?
        .iter()
        .filter_map(|(_, value)| value.as_table())
        .find(|table| {
            table
                .get("chain-id")
                .and_then(|v| v.as_str())
                .map_or(false, |id| id == target_chain_id)
        });
    let original_published_id = table.and_then(|table| {
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
                    anyhow!("No version specified and no versions found in git_versioning".red())
                })?,
        };

        let git_info = package_info.git_versioning.get(&version).ok_or_else(|| {
            anyhow!(
                "{} {} {}",
                "version".red(),
                version.red().bold(),
                "does not exist in on-chain PackageInfo".red()
            )
        })?;

        let (move_toml_path, move_lock_path) =
            fetched_files.get(name_with_version).ok_or_else(|| {
                anyhow!("{} {}",
                    "Failed to find fetched files `Move.toml` and `Move.lock` when building package graph for".red(),
                    name_with_version.red().bold()
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
        .map_err(|e| anyhow!("{}", e.red()))
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
        Err(anyhow!(
            "Invalid name structure when fetching on-chain data for package".red()
        ))
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
        .ok_or_else(|| anyhow!("Failed to extract value field as JSON for PackageInfo ID".red()))?;

    let package_info_id_str = match network {
        PackageInfoNetwork::Mainnet => json_value["app_info"]["package_info_id"]
            .as_str()
            .ok_or_else(|| anyhow!("PackageInfo ID not found for Mainnet".red()))?,
        PackageInfoNetwork::Testnet => {
            let networks = json_value["networks"]["contents"]
                .as_array()
                .ok_or_else(|| anyhow!("Expected networks array for PackageInfo ID".red()))?;

            networks
                .iter()
                .find(|entry| entry["key"] == "testnet")
                .and_then(|testnet_entry| testnet_entry["value"]["package_info_id"].as_str())
                .ok_or_else(|| anyhow!("PackageInfo ID not found for testnet".red()))?
        }
    };

    ObjectID::from_hex_literal(package_info_id_str)
        .map_err(|e| anyhow!("{} {}", "Failed to parse PackageInfo ID:".red(), e.red()))
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
        .ok_or_else(|| anyhow!("Expected upgrade_cap_id field".red()))?;

    ObjectID::from_hex_literal(&id_str).map_err(|e| {
        anyhow!(
            "{} {}",
            "Failed to PackageInfo Upgrade Cap ID:".red(),
            e.red()
        )
    })
}

fn get_package_address(package_info: &SuiObjectResponse) -> Result<ObjectID> {
    let id_str = package_info
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_data| move_data.fields.field_value("package_address"))
        .map(|id| id.to_string())
        .ok_or_else(|| anyhow!("Expected package_address field".red()))?;

    ObjectID::from_hex_literal(&id_str).map_err(|e| {
        anyhow!(
            "{} {}",
            "Failed to PackageInfo Package Address:".red(),
            e.red()
        )
    })
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
        .map_err(|e| anyhow!("{} {}", "No package info:".red(), e.red()))
}

fn get_git_versioning_id(package_info: &SuiObjectResponse) -> Result<ObjectID> {
    let json_value = package_info
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_object| move_object.fields.field_value("git_versioning"))
        .map(|git_versioning| git_versioning.to_json_value())
        .ok_or_else(|| anyhow!("No git_versioning field".red()))?;

    let id_str = json_value["id"]["id"]
        .as_str()
        .ok_or_else(|| anyhow!("Expected git_versioning string".red()))?;

    ObjectID::from_hex_literal(id_str)
        .map_err(|e| anyhow!("{} {}", "Invalid git versioning ID:".red(), e.red()))
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
                    "{} {}",
                    "Failed to parse package address for packageAtVersion GQL request:".red(),
                    e.red()
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
            .map_err(|e| anyhow!("{} {}", "Failed to parse index:".red(), e.red())),
        JValue::Number(n) => n
            .as_u64()
            .ok_or_else(|| anyhow!("Index is not a u64".red())),
        _ => Err(anyhow!("Unexpected index type".red())),
    }
}

fn extract_git_info(dynamic_field_data: &SuiObjectResponse) -> Result<GitInfo> {
    let git_info = dynamic_field_data
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_object| move_object.fields.field_value("value"))
        .ok_or_else(|| anyhow!("Failed to extract git info".red()))?
        .to_json_value();

    let repository = git_info["repository"]
        .as_str()
        .ok_or_else(|| anyhow!("No repository field".red()))?
        .to_string();
    let tag = git_info["tag"]
        .as_str()
        .ok_or_else(|| anyhow!("No tag field".red()))?
        .to_string();
    let path = git_info["path"]
        .as_str()
        .ok_or_else(|| anyhow!("No path field".red()))?
        .to_string();

    Ok(GitInfo {
        repository,
        tag,
        path,
    })
}

/// Given a normalized Move Registry package name, split out the version number (if any).
pub fn parse_package_version(name: &str) -> anyhow::Result<(String, Option<u64>)> {
    let versioned_name = VersionedName::from_str(name)?;
    Ok((versioned_name.name, versioned_name.version))
}

async fn fetch_move_files(
    name: &str,
    git_info: &GitInfo,
    temp_dir: &TempDir,
) -> Result<(PathBuf, PathBuf)> {
    let files_to_fetch = ["Move.toml", "Move.lock"];
    let repo_dir = shallow_clone_repo(name, git_info, temp_dir)?;

    let mut file_paths = Vec::new();
    for file_name in &files_to_fetch {
        let source_path = repo_dir.join(&git_info.path).join(file_name);
        let dest_path = temp_dir.path().join(file_name);

        fs::copy(&source_path, &dest_path)
            .with_context(|| format!("Failed to copy {} for package {}", file_name, name))?;

        file_paths.push(dest_path);
    }

    Ok((file_paths[0].clone(), file_paths[1].clone()))
}

fn shallow_clone_repo(
    package_name: &str,
    git_info: &GitInfo,
    temp_dir: &TempDir,
) -> Result<PathBuf> {
    if Command::new("git").arg("--version").output().is_err() {
        return Err(anyhow!(
            "Git is not available in the system PATH. Please install git and try again.".red()
        ));
    }
    let repo_dir = temp_dir.path().join("repo");
    let output = Command::new("git")
        .arg("clone")
        .arg("--depth=1")
        .arg("--branch")
        .arg(&git_info.tag)
        .arg(&git_info.repository)
        .arg(&repo_dir)
        .output()
        .context("Failed to execute git clone command")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!(
            "{} {} {} {} {} {}",
            "Failed to clone repository for package".red(),
            package_name.red().bold(),
            ": Git error:".red(),
            stderr.red().bold(),
            "Repository:".red(),
            git_info.repository.red().bold(),
        ));
    }

    Ok(repo_dir)
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

    let move_section = doc[LOCK_MOVE_KEY].as_table_mut().ok_or_else(|| {
        anyhow!(
            "{}{}{}",
            "Expected [".red(),
            LOCK_MOVE_KEY.red(),
            "] table to construct graph in lock file".red()
        )
    })?;

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
        .ok_or_else(|| anyhow!("Failed to get or create package array in lock file".red()))?;
    packages.push(new_package);
    Ok(doc.to_string())
}

fn parse_source_package_name(toml_content: &str) -> Result<String> {
    let doc = toml_content
        .parse::<DocumentMut>()
        .context("Failed to parse TOML content in lock file".red())?;

    let package_table = doc[LOCK_PACKAGE_KEY].as_table().ok_or_else(|| {
        anyhow!(
            "{}{}{}",
            "Failed to find [".red(),
            LOCK_PACKAGE_KEY.red(),
            "] table in lock file".red()
        )
    })?;

    let name = package_table[LOCK_PACKAGE_NAME_KEY]
        .as_str()
        .ok_or_else(|| {
            anyhow!(
                "{}{}{}{}{}",
                "Failed to find '".red(),
                LOCK_PACKAGE_NAME_KEY.red(),
                "' in [".red(),
                LOCK_PACKAGE_KEY.red(),
                "] table in lock file".red()
            )
        })?;

    Ok(name.to_string())
}

async fn update_mvr_packages(
    move_toml_path: &Path,
    package_name: &str,
    network: &str,
) -> Result<String> {
    let (mainnet_client, testnet_client) = setup_sui_clients().await?;
    let dependency = MoveRegistryDependency {
        network: network.to_string(),
        packages: vec![package_name.to_string()],
    };
    let network = match dependency.network.as_str() {
        "testnet" => &PackageInfoNetwork::Testnet,
        "mainnet" => &PackageInfoNetwork::Mainnet,
        _ => bail!(
            "{} {} {}",
            "Unrecognized network".red(),
            dependency.network.red().bold(),
            "specified for this dependency: Must be one of mainnet or testnet".red()
        ),
    };
    let client = match network {
        PackageInfoNetwork::Testnet => &testnet_client,
        PackageInfoNetwork::Mainnet => &mainnet_client,
    };

    let resolved_packages =
        resolve_on_chain_package_info(&mainnet_client, client, network, &dependency).await?;
    let toml_content = fs::read_to_string(&move_toml_path).with_context(|| {
        format!(
            "{} {}",
            "Failed to read file:".red(),
            move_toml_path.display().red().bold()
        )
    })?;
    let mut doc = toml_content
        .parse::<DocumentMut>()
        .context("Failed to parse TOML content")?;

    if !doc.contains_key(DEPENDENCIES_KEY) {
        doc[DEPENDENCIES_KEY] = Item::Table(Table::new());
    }
    let dependencies = doc[DEPENDENCIES_KEY].as_table_mut().unwrap();
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
    let placeholder_address =
        ObjectID::from_hex_literal(&package_info.package_address.to_string())?;
    let MoveTomlPublishedID {
        internal_pkg_name: Some(name),
        ..
    } = get_published_ids(&dep_move_toml_content, &placeholder_address).await
    else {
        bail!(
            "Unable to discover a local name to give this package in your Move.toml, \
             please give this dependency an appropriate name and add it under \
             [dependencies] as follows: \
             YourName = {{ r.mvr = \"{package_name}\" }}"
                .red()
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
        eprintln!(
            "{}",
            "Network value already exists in r.mvr section. It will be overwritten.".yellow()
        );
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

    let output_msg = format!(
        "{}\nYou can use this dependency in your modules by calling: {}",
        &format!(
            "\nSuccessfully added dependency {} to your Move.toml\n",
            package_name.green()
        ),
        &format!("use {}::<module>;\n", name).green()
    );
    force_build();

    Ok(output_msg)
}

/// List the App Registry
pub async fn subcommand_list(filter: Option<String>) -> Result<CommandOutput> {
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
            let pkg_testnet =
                get_package_info(&name_object, &testnet_client, &PackageInfoNetwork::Testnet)
                    .await
                    .unwrap_or(None);
            let pkg_mainnet =
                get_package_info(&name_object, &mainnet_client, &PackageInfoNetwork::Mainnet)
                    .await
                    .unwrap_or(None);
            if let Some(ref filter) = filter {
                if is_name(filter) {
                    if &name == filter {
                        return Ok(CommandOutput::List(vec![App {
                            name: name.clone(),
                            package_info: vec![
                                (PackageInfoNetwork::Testnet, pkg_testnet),
                                (PackageInfoNetwork::Mainnet, pkg_mainnet),
                            ],
                        }]));
                    }
                }
                // it is an address
                else {
                    if let Some(ref pkg) = pkg_testnet {
                        if &pkg.package_address.to_string() == filter {
                            return Ok(CommandOutput::List(vec![App {
                                name: name.clone(),
                                package_info: vec![
                                    (PackageInfoNetwork::Testnet, pkg_testnet),
                                    (PackageInfoNetwork::Mainnet, pkg_mainnet),
                                ],
                            }]));
                        }
                    }
                    if let Some(ref pkg) = pkg_mainnet {
                        if &pkg.package_address.to_string() == filter {
                            return Ok(CommandOutput::List(vec![App {
                                name: name.clone(),
                                package_info: vec![
                                    (PackageInfoNetwork::Testnet, pkg_testnet),
                                    (PackageInfoNetwork::Mainnet, pkg_mainnet),
                                ],
                            }]));
                        }
                    }
                }
            }
            let app = App {
                name: name.clone(),
                package_info: vec![
                    (PackageInfoNetwork::Testnet, pkg_testnet),
                    (PackageInfoNetwork::Mainnet, pkg_mainnet),
                ],
            };
            output.push(app);
        }

        if !dynamic_fields.has_next_page {
            break;
        }
        cursor = dynamic_fields.next_cursor;
    }
    if filter.is_some() {
        Ok(CommandOutput::List(vec![]))
    } else {
        Ok(CommandOutput::List(output))
    }
}

pub async fn subcommand_add_dependency(package_name: &str, network: &str) -> Result<CommandOutput> {
    if network != "testnet" && network != "mainnet" {
        bail!("network must be one of \"testnet\" or \"mainnet\"".red());
    }
    let current_dir = env::current_dir().context("Failed to get current directory")?;
    let move_toml_path = current_dir.join("Move.toml");
    if !move_toml_path.exists() {
        return Err(anyhow!("Move.toml not found in the current directory".red()));
    }
    let cmd_output = update_mvr_packages(&move_toml_path, package_name, network).await?;

    Ok(CommandOutput::Add(cmd_output))
}

pub async fn subcommand_register_name(_name: &str) -> Result<CommandOutput> {
    println!("tbd!");
    Ok(CommandOutput::Register)
}

/// resolve a .move name to an address. E.g., `nft@sample` => 0x... cf. subcommand_list implementation.
pub async fn subcommand_resolve_name(name: &str) -> Result<CommandOutput> {
    subcommand_list(Some(name.to_string())).await
}

/// Check if the provided name is a name or an address.
// TODO this should use manos' checks from GraphQL
fn is_name(name: &str) -> bool {
    name.starts_with("@")
}
