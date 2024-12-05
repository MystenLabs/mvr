pub mod binary_version_check;
pub mod commands;
pub mod constants;
pub mod types;

use crate::binary_version_check::force_build;
use crate::commands::App;
use crate::types::package::PackageInfoNetwork;
use crate::types::SuiConfig;
use crate::types::{MoveRegistryDependency, MoveTomlPublishedID};

use commands::CommandOutput;
use types::app_record::AppInfo;
use types::app_record::AppRecord;
use types::package::GitInfo;
use types::package::PackageInfo;
use types::Name;
use types::VersionedName;

use sui_client::Client;
use sui_client::DynamicFieldOutput;
use sui_client::PaginationFilter;
use sui_types::types::Address;
use sui_types::types::ObjectId;
use sui_types::types::TypeTag;

use std::collections::{HashMap, HashSet};
use std::env;
use std::fs::{self};
use std::io::{self, Write};
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;
use std::str::FromStr;

use anyhow::{anyhow, bail, Context, Result};
use once_cell::sync::Lazy;
use regex::Regex;
use serde_json::Value as JValue;
use tempfile::TempDir;
use toml_edit::{
    value, Array, ArrayOfTables, DocumentMut, Formatted, InlineTable, Item, Table, Value,
};
use yansi::Paint;

const SUI_DIR: &str = ".sui";
const SUI_CONFIG_DIR: &str = "sui_config";
const SUI_CLIENT_CONFIG: &str = "client.yaml";

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

const TESTNET_CHAIN_ID: &str = "4c78adac";
const MAINNET_CHAIN_ID: &str = "35834a8a";

const MAINNET_GQL_URL: &str = "https://mvr-rpc.sui-mainnet.mystenlabs.com/";
const TESTNET_GQL_URL: &str = "https://mvr-rpc.sui-testnet.mystenlabs.com/";

const VERSIONED_NAME_REGEX: &str = concat!(
    "^",
    r"([a-z0-9.\-@]*)",
    r"\/",
    "([a-z0-9.-]*)",
    r"(?:\/(\d+))?",
    "$"
);

static PACKAGE_INFO_TYPETAG: Lazy<TypeTag> = Lazy::new(|| {
    TypeTag::from_str(
        "0x4433047b14865ef466c55c35ec0f8a55726628e729d21345f2c4673582ec15a8::package::PackageInfo",
    )
    .expect("Failed to parse TypeTag for PackageInfo")
});

static NAME_TYPETAG: Lazy<TypeTag> = Lazy::new(|| {
    TypeTag::from_str(
        "0xdc7979da429684890fdff92ff48ec566f4b192c8fb7bcf12ab68e9ed7d4eb5e0::name::Name",
    )
    .expect("Failed to parse TypeTag for Name df")
});

static APP_REC_TYPETAG: Lazy<TypeTag> = Lazy::new(|| {
    TypeTag::from_str(
        "0xdc7979da429684890fdff92ff48ec566f4b192c8fb7bcf12ab68e9ed7d4eb5e0::app_record::AppRecord",
    )
    .expect("Failed to parse TypeTag for AppRecord")
});

static VERSIONED_NAME_REG: Lazy<Regex> = Lazy::new(|| Regex::new(VERSIONED_NAME_REGEX).unwrap());

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
    let config = SuiConfig::read_from_file(&config_path)?;
    let client_chain = config.active_env()?.rpc();
    // we need to harden this as the client_chain may not be the same as the network
    let client_chain = match client_chain.contains("testnet") {
        true => TESTNET_CHAIN_ID,
        false => MAINNET_CHAIN_ID,
    };
    let (mainnet_client, testnet_client) = setup_sui_clients();
    match (client_chain, network) {
        (chain_id, PackageInfoNetwork::Testnet) if chain_id == TESTNET_CHAIN_ID => &testnet_client,
        (chain_id, PackageInfoNetwork::Mainnet) if chain_id == MAINNET_CHAIN_ID => &mainnet_client,
        (chain_id, _) => {
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
    };

    let resolved_packages = resolve_on_chain_package_info(network, &dependency).await?;
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
    network: &PackageInfoNetwork,
    dependency: &MoveRegistryDependency,
) -> Result<HashMap<String, PackageInfo>> {
    let package_name_map: Result<HashMap<String, String>> = dependency
        .packages
        .iter()
        .map(|package| parse_package_version(package).map(|(name, _)| (name, package.clone())))
        .collect();
    let package_name_map = package_name_map?;
    // Create set of package names with version stripped (we check version info later).
    // let package_set: HashSet<String> = package_name_map.keys().cloned().collect();
    let mut resolved_packages: HashMap<String, PackageInfo> = HashMap::new();

    for (name, _) in package_name_map.iter() {
        let pkg = resolve_package_by_name(&name).await?;
        let package_info = match network {
            PackageInfoNetwork::Mainnet => pkg.1,
            PackageInfoNetwork::Testnet => pkg.0,
        };

        if let Some(package_info) = package_info {
            resolved_packages.insert(name.clone(), package_info);
        } else {
            bail!(
                "{} {} {} {}{}",
                "No on-chain PackageInfo for package".red(),
                name.red().bold(),
                "on".red(),
                network.red().bold(),
                "(it may not be registered).".red()
            );
        }
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
    } = published_ids(&move_toml_content, &original_address_on_chain).await;
    let target_chain_id = match network {
        PackageInfoNetwork::Mainnet => MAINNET_CHAIN_ID,
        PackageInfoNetwork::Testnet => TESTNET_CHAIN_ID,
    };
    let address = addresses_id
        .map(|id_str| {
            ObjectId::from_str(&id_str).map_err(|e| {
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
            ObjectId::from_str(&id_str).map_err(|e| {
                anyhow!(
                    "{} {}",
                    "Failed to parse published-at address of Move.toml:".red(),
                    e.red()
                )
            })
        })
        .transpose()?;

    // The original-published-id may exist in the Move.lock
    let original_published_id_in_lock = original_published_id(&move_lock_content, target_chain_id)
        .map(|id_str| {
            ObjectId::from_str(&id_str).map_err(|e| {
                anyhow!(
                    "{} {}",
                    "Failed to parse original-published-id in Move.lock:".red(),
                    e.red()
                )
            })
        })
        .transpose()?;

    let (original_source_id, provenance): (ObjectId, String) = match (
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
            if address_id == ObjectId::ZERO || published_at_id == address_id =>
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
pub async fn published_ids(
    move_toml_content: &str,
    original_address_on_chain: &ObjectId,
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

fn original_published_id(move_toml_content: &str, target_chain_id: &str) -> Option<String> {
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

fn setup_sui_clients() -> (Client, Client) {
    let mainnet_client = Client::new_mainnet();
    let testnet_client = Client::new_testnet();
    (mainnet_client, testnet_client)
}

fn normalize_app_name(name: &Name) -> Result<String> {
    let unknown = "unknown".to_string();
    let org_name = name.org.labels.get(1);
    let app_name = name.app.first();

    Ok(format!(
        "@{}/{}",
        org_name.unwrap_or(&unknown),
        app_name.unwrap_or(&unknown)
    ))
}

async fn package_info(app_info: &AppInfo, client: &Client) -> Result<Option<PackageInfo>> {
    let package_info_id = app_info
        .package_info_id
        .ok_or_else(|| anyhow!("Expected package_info_id field in AppInfo".red()))?;
    let upgrade_cap_id = app_info
        .upgrade_cap_id
        .ok_or_else(|| anyhow!("Expected upgrade_cap_id field in AppInfo".red()))?;
    let package_address = app_info
        .package_address
        .ok_or_else(|| anyhow!("Expected package_address field in AppInfo".red()))?
        .into();
    let git_versioning = git_versioning(package_info_id, client).await?;

    Ok(Some(PackageInfo {
        upgrade_cap_id,
        package_address,
        git_versioning,
    }))
}

async fn git_versioning(
    package_info_id: ObjectId,
    client: &Client,
) -> Result<HashMap<u64, GitInfo>> {
    let package_info = client
        .move_object_contents(*package_info_id.as_address(), None)
        .await?;
    let git_versioning_id = git_versioning_id(package_info.as_ref())?;
    let mut result = HashMap::new();

    let mut cursor = None;
    loop {
        let page = client
            .dynamic_fields(
                *git_versioning_id.as_address(),
                PaginationFilter {
                    cursor,
                    ..Default::default()
                },
            )
            .await?;

        for dynamic_field_info in page.data().iter() {
            let index = extract_index(dynamic_field_info)?;
            let git_info = GitInfo::extract_git_info(dynamic_field_info)?;
            result.insert(index, git_info);
        }
        if !page.page_info().has_next_page {
            break;
        }
        cursor = page.page_info().end_cursor.clone();
    }

    Ok(result)
}

fn git_versioning_id(package_info: Option<&JValue>) -> Result<ObjectId> {
    let package_info = package_info.ok_or_else(|| anyhow!("No package info".red()))?;
    let json_value = &package_info["git_versioning"];
    let id_str = json_value["id"]
        .as_str()
        .ok_or_else(|| anyhow!("Expected git_versioning string".red()))?;

    ObjectId::from_str(id_str)
        .map_err(|e| anyhow!("{} {}", "Invalid git versioning ID:".red(), e.red()))
}

async fn package_at_version(
    address: &str,
    version: u64,
    network: &PackageInfoNetwork,
) -> Result<Option<ObjectId>> {
    let client = match network {
        PackageInfoNetwork::Mainnet => Client::new(MAINNET_GQL_URL),
        PackageInfoNetwork::Testnet => Client::new(TESTNET_GQL_URL),
    }?;

    let address = client
        .object(Address::from_str(address)?, Some(version))
        .await?;

    Ok(address.map(|obj| obj.object_id()))
}

fn extract_index(dynamic_field: &DynamicFieldOutput) -> Result<u64> {
    let index = dynamic_field
        .name
        .json
        .as_ref()
        .and_then(|json| match json {
            JValue::String(s) => s.parse::<u64>().ok(),
            JValue::Number(n) => n.as_u64(),
            _ => None,
        });
    if let Some(index) = index {
        Ok(index)
    } else {
        Err(anyhow!("Unexpected index type".red()))
    }
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

    let switch_to_sha = Command::new("git")
        .arg("-C")
        .arg(&repo_dir)
        .arg("checkout")
        .arg(&git_info.tag)
        .output()
        .context("Failed to execute git checkout command")?;

    if !switch_to_sha.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!(
            "{} {} {} {} {} {}",
            "Failed to checkout repository for package".red(),
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

    let resolved_packages = resolve_on_chain_package_info(network, &dependency).await?;
    let toml_content = fs::read_to_string(move_toml_path).with_context(|| {
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
    let placeholder_address = ObjectId::from_str(&package_info.package_address.to_string())?;
    let MoveTomlPublishedID {
        internal_pkg_name: Some(name),
        ..
    } = published_ids(&dep_move_toml_content, &placeholder_address).await
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
    force_build()?;

    Ok(output_msg)
}

/// List the App Registry
pub async fn subcommand_list(filter: Option<String>) -> Result<CommandOutput> {
    if let Some(ref filter) = filter {
        return subcommand_resolve_name(filter).await;
    }
    let (mainnet_client, _) = setup_sui_clients();
    let app_registry_id = ObjectId::from_str(APP_REGISTRY_TABLE_ID)?;
    let mut output = vec![];
    let address = app_registry_id.as_address();
    let mut cursor = None;
    loop {
        let page = mainnet_client
            .dynamic_fields(
                *address,
                PaginationFilter {
                    cursor,
                    ..Default::default()
                },
            )
            .await?;
        for dynamic_field_info in page.data().iter() {
            let df_name: Name = dynamic_field_info.try_into()?;
            let app_record: AppRecord = dynamic_field_info.try_into()?;
            let (pkg_testnet, pkg_mainnet) = extract_pkg_info(&app_record).await;

            let name = normalize_app_name(&df_name)?;
            let app = App {
                name: name.clone(),
                package_info: vec![
                    (PackageInfoNetwork::Testnet, pkg_testnet),
                    (PackageInfoNetwork::Mainnet, pkg_mainnet),
                ],
            };
            output.push(app);
        }
        if !page.page_info().has_next_page {
            break;
        }
        cursor = page.page_info().end_cursor.clone();
    }
    if filter.is_some() {
        Ok(CommandOutput::List(vec![]))
    } else {
        Ok(CommandOutput::List(output))
    }
}

/// Given an app record, extract the package information by fetching the package info contents and
/// the git info for the package, if any.
async fn extract_pkg_info(app_record: &AppRecord) -> (Option<PackageInfo>, Option<PackageInfo>) {
    let (mainnet_client, testnet_client) = setup_sui_clients();
    let pkg_testnet = if let Some(networks) = app_record.networks.get(TESTNET_CHAIN_ID) {
        package_info(networks, &testnet_client)
            .await
            .unwrap_or(None)
    } else if let Some(ref app_info) = app_record.app_info {
        package_info(app_info, &testnet_client)
            .await
            .unwrap_or(None)
    } else {
        None
    };

    let pkg_mainnet = if let Some(networks) = app_record.networks.get(MAINNET_CHAIN_ID) {
        package_info(networks, &mainnet_client)
            .await
            .unwrap_or(None)
    } else if let Some(app_info_mainnet) = &app_record.app_info {
        package_info(app_info_mainnet, &mainnet_client)
            .await
            .unwrap_or(None)
    } else {
        None
    };
    (pkg_testnet, pkg_mainnet)
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

pub async fn resolve_package_by_name(
    name: &str,
) -> Result<(Option<PackageInfo>, Option<PackageInfo>)> {
    let (mainnet_client, _) = setup_sui_clients();
    let df_name: Name = name.try_into()?;
    let df = mainnet_client
        .dynamic_field(
            Address::from_str(APP_REGISTRY_TABLE_ID)?,
            NAME_TYPETAG.clone(),
            df_name,
        )
        .await?;

    if let Some(df) = df {
        let app_record: AppRecord = df.deserialize_value(&APP_REC_TYPETAG)?;
        let (pkg_testnet, pkg_mainnet) = extract_pkg_info(&app_record).await;
        Ok((pkg_testnet, pkg_mainnet))
    } else {
        Ok((None, None))
    }
}

/// resolve a .move name to an address. E.g., `nft@sample` => 0x... cf. subcommand_list implementation.
pub async fn subcommand_resolve_name(name: &str) -> Result<CommandOutput> {
    let result = resolve_package_by_name(name).await;
    if let Ok(df) = result {
        let app = App {
            name: name.to_string(),
            package_info: vec![
                (PackageInfoNetwork::Testnet, df.0),
                (PackageInfoNetwork::Mainnet, df.1),
            ],
        };
        Ok(CommandOutput::List(vec![app]))
    } else {
        Ok(CommandOutput::List(vec![]))
    }
}

pub fn sui_config_dir() -> Result<PathBuf, anyhow::Error> {
    match std::env::var_os("SUI_CONFIG_DIR") {
        Some(config_env) => Ok(config_env.into()),
        None => match dirs::home_dir() {
            Some(v) => Ok(v.join(SUI_DIR).join(SUI_CONFIG_DIR)),
            None => anyhow::bail!("Cannot obtain home directory path"),
        },
    }
    .and_then(|dir| {
        if !dir.exists() {
            fs::create_dir_all(dir.clone())?;
        }
        Ok(dir)
    })
}
