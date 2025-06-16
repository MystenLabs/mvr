pub mod commands;
pub mod constants;
pub mod errors;
pub mod types;
pub mod utils;

use crate::types::MoveTomlPublishedID;

use commands::CommandOutput;
use errors::CliError;
use mvr_types::name::VersionedName;
use types::api_types::PackageRequest;
use types::api_types::SafeGitInfo;
use types::Network;
use utils::api_data::resolve_name;
use utils::api_data::search_names;
use utils::api_data::{query_multiple_dependencies, query_package};
use utils::git::shallow_clone_repo;

use sui_sdk_types::ObjectId;
use types::MoveRegistryDependencies;
use utils::manifest::{MoveToml, ADDRESSES_KEY, DEPENDENCIES_KEY, PUBLISHED_AT_KEY};
use utils::sui_binary::get_active_network;

use std::collections::HashMap;
use std::env;
use std::fs::{self};
use std::io::{self, Write};
use std::path::PathBuf;
use std::str::FromStr;

use anyhow::{anyhow, bail, Context, Result};
use tempfile::TempDir;
use toml_edit::{
    value, Array, ArrayOfTables, DocumentMut, Formatted, InlineTable, Item, Table, Value,
};
use yansi::Paint;

const LOCK_MOVE_KEY: &str = "move";
const LOCK_PACKAGE_KEY: &str = "package";
const LOCK_PACKAGE_NAME_KEY: &str = "name";
const LOCK_PACKAGE_ID_KEY: &str = "id";
const LOCK_PACKAGE_VERSION_KEY: &str = "version";

const TESTNET_CHAIN_ID: &str = "4c78adac";
const MAINNET_CHAIN_ID: &str = "35834a8a";

/// Resolves move registry packages. This function is invoked by `sui move build` and given the
/// a key associated with the external resolution in a Move.toml file. For example, this
/// TOML would trigger sui move build to call this binary and hit this function with value `mvr`:
///
/// MyDep = { r.mvr = "@mvr/demo" }
///
/// The high-level logic of this function is as follows:
/// 1) Fetch on-chain data for `packages`: the GitHub repository, branch, and subpath
/// 2) Fetches the package dependency graph from the package source (e.g., from GitHub).
/// 3) Constructs the dependency graph represented in the `Move.lock` format and emits it
///    for each package, allow the `sui move build` command to resolve packages from GitHub.
pub async fn resolve_move_dependencies(key: &str) -> Result<()> {
    let content = fs::read_to_string("Move.toml")?;

    // Get the active network from the CLI.
    let network = get_active_network()?;

    // we won't be writing in this phase.
    let move_toml = MoveToml::new_from_content(&content, None)?;

    let dependency = move_toml.get_dependencies_by_name(key)?;

    eprintln!(
        "{} {}: {:?} {} {}",
        "RESOLVING".blue(),
        key.blue().bold(),
        dependency.packages.blue().bold(),
        "ON".blue(),
        network.blue().bold(),
    );

    // If the network is set in the Move.toml, warn that it is deprecated and no longer used.
    if move_toml.get_network().is_some() {
        eprintln!("Warning: The `[r.mvr]` network's section in Move.toml is no longer used. Adding/building packages depends on the active network from Sui CLI.");
    }

    let resolved_packages = query_multiple_dependencies(dependency, &network).await?;

    let temp_dir = TempDir::new().context("Failed to create temporary directory")?;
    let mut fetched_files: HashMap<String, (PathBuf, PathBuf)> = HashMap::new();

    for (name_with_version, package_info) in &resolved_packages {
        let (key, value) = fetch_package_files(name_with_version, package_info, &temp_dir).await?;
        fetched_files.insert(key, value);
    }

    check_address_consistency(&resolved_packages, &network, &fetched_files).await?;

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
    request_data: &PackageRequest,
    temp_dir: &TempDir,
) -> Result<(String, (PathBuf, PathBuf))> {
    let name = VersionedName::from_str(name_with_version)?;

    let (move_toml_path, move_lock_path) =
        fetch_move_files(&name, &request_data.get_git_info()?.try_into()?, temp_dir).await?;

    Ok((
        name_with_version.to_string(),
        (move_toml_path, move_lock_path),
    ))
}

pub async fn check_address_consistency(
    resolved_packages: &HashMap<String, PackageRequest>,
    network: &Network,
    fetched_files: &HashMap<String, (PathBuf, PathBuf)>,
) -> Result<()> {
    for (name_with_version, request_data) in resolved_packages {
        check_single_package_consistency(name_with_version, request_data, network, fetched_files)
            .await?;
    }
    Ok(())
}

async fn check_single_package_consistency(
    name_with_version: &str,
    request_data: &PackageRequest,
    network: &Network,
    fetched_files: &HashMap<String, (PathBuf, PathBuf)>,
) -> Result<()> {
    let versioned_name = VersionedName::from_str(name_with_version)?;

    eprintln!(
        "{} {} {} {}",
        "USING ON-CHAIN VERSION".blue(),
        request_data.version.blue().bold(),
        "OF".blue(),
        name_with_version.blue().bold(),
    );

    let original_address_on_chain = if request_data.version > 1 {
        let mut versioned_one_name = versioned_name.clone();
        versioned_one_name.version = Some(1);

        resolve_name(&versioned_one_name, network)
            .await
            .map_err(|_| {
                anyhow::anyhow!("Failed to retrieve original package address at version 1".red())
            })?
    } else {
        ObjectId::from_str(&request_data.package_address)?
    };

    let git_info: SafeGitInfo = request_data.get_git_info()?.try_into()?;

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

    let target_chain_id = get_chain_id(network)?;

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
    let original_published_id_in_lock = original_published_id(&move_lock_content, &target_chain_id)
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
                "Unable to find the original published address in package {}'s \
                 repository {} branch {} subdirectory {}. For predictable detection, see documentation \
                 on Automated Address Management for recording published addresses in the `Move.lock` file.",
                versioned_name.name,
                git_info.repository_url,
                git_info.tag,
                git_info.path
            )
        }
    };

    // Main consistency check: The on-chain package address should correspond to the original ID in the source package.
    if original_address_on_chain != original_source_id {
        bail!(
            "Mismatch: The original package address for {} on {network} is {original_address_on_chain}, \
             but the {provenance} in {}'s repository was found to be {original_source_id}.\n\
             Check the configuration of the package's repository {} in branch {} in subdirectory {}",
            versioned_name.name,
            versioned_name.name,
            git_info.repository_url,
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
                .get(LOCK_PACKAGE_NAME_KEY)
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
    resolved_packages: &HashMap<String, PackageRequest>,
    fetched_files: &HashMap<String, (PathBuf, PathBuf)>,
) -> Result<Vec<String>> {
    let mut lock_files: Vec<String> = vec![];

    for (name_with_version, package_info) in resolved_packages {
        let git_info: SafeGitInfo = package_info.get_git_info()?.try_into()?;

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
            insert_root_dependency(&move_lock_content, &root_name_from_source, &git_info)?;

        lock_files.push(lock_with_root);
    }

    Ok(lock_files)
}

async fn fetch_move_files(
    name: &VersionedName,
    git_info: &SafeGitInfo,
    temp_dir: &TempDir,
) -> Result<(PathBuf, PathBuf)> {
    let files_to_fetch = ["Move.toml", "Move.lock"];
    let repo_dir = shallow_clone_repo(name, git_info, temp_dir)?;

    let file_paths = files_to_fetch.map(|file_name| repo_dir.join(&git_info.path).join(file_name));

    if !file_paths[0].exists() {
        bail!(CliError::MissingTomlFile(name.to_string()));
    }

    if !file_paths[1].exists() {
        bail!(CliError::MissingLockFile(name.to_string()));
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
    git_info: &SafeGitInfo,
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

    let package_version = move_section
        .get(LOCK_PACKAGE_VERSION_KEY)
        .unwrap_or(&value(1))
        .as_integer()
        .ok_or_else(|| anyhow!("Invalid version in lock file".red()))?;

    // Save the top-level `dependencies`, which will become the dependencies of the new root package.
    let original_deps = move_section.get("dependencies").cloned();
    // Do the same for `dev-dependencies`
    let original_dev_deps = move_section.get("dev-dependencies").cloned();

    // Make the top-level `dependencies` point to the new root package.
    let new_dep = {
        let mut table = InlineTable::new();
        table.insert(
            LOCK_PACKAGE_NAME_KEY,
            Value::String(Formatted::new(root_name.to_string())),
        );
        table.insert(
            LOCK_PACKAGE_ID_KEY,
            Value::String(Formatted::new(root_name.to_string())),
        );
        Value::InlineTable(table)
    };

    let mut new_deps = Array::new();
    new_deps.push(new_dep);
    move_section["dependencies"] = value(new_deps);
    // Reset the `dev-dependencies` as they will get re-rooted
    move_section["dev-dependencies"] = value(Array::new());

    // Create a new root package entry, set its dependencies to the original top-level dependencies, and persist.
    let mut new_package = Table::new();
    new_package.insert(LOCK_PACKAGE_ID_KEY, value(root_name));

    let mut source = Table::new();
    source.insert("git", value(&git_info.repository_url.clone()));
    source.insert("rev", value(&git_info.tag.clone()));
    source.insert("subdir", value(&git_info.path.clone()));
    new_package.insert("source", value(source.into_inline_table()));

    if let Some(deps) = original_deps {
        new_package.insert("dependencies", deps);
    }

    if let Some(deps) = original_dev_deps {
        new_package.insert("dev-dependencies", deps);
    }

    let packages = move_section
        .entry("package")
        .or_insert(Item::ArrayOfTables(ArrayOfTables::new()))
        .as_array_of_tables_mut()
        .ok_or_else(|| anyhow!("Failed to get or create package array in lock file".red()))?;

    for package in packages.iter_mut() {
        if let Some(source) = convert_local_dep_to_git(package, &git_info)? {
            package.insert("source", value(source));
        }
    }

    packages.push(new_package);

    // If the lockfile is version 2, migrate to version 3.
    // Migration to version 3 requires an `id` field in the lockfile.
    if package_version < 3 {
        migrate_to_version_three(packages)?;
        move_section.insert(LOCK_PACKAGE_VERSION_KEY, value(3));
    }

    Ok(doc.to_string())
}

/// For `local` dependencies of a given package, we want to convert them into `git` dependencies,
/// where the `git` dependency's `repository_url` is the parent package's `repository_url`,
/// the `tag` is the parent package's `rev`, and the `path` is the parent package's `path` joined
/// with the `local` dependency's `path`.
///
/// Before:
///
/// id = "dep"
/// source = { local = "../token" }
/// After:
///
/// id = "dep"
/// source = { git = "https://github.com/mvr-test/parent-package.git", rev = "v1.0.0", subdir = "packages/parent-package-dir/token" }
///
fn convert_local_dep_to_git(
    dependency: &Table,
    git_info: &SafeGitInfo,
) -> Result<Option<InlineTable>> {
    dependency
        .get("source")
        .and_then(|items| items.as_table_like())
        .and_then(|items| items.get("local"))
        .map(|local| {
            let mut new_source = Table::new();
            new_source.insert("git", value(&git_info.repository_url.clone()));
            new_source.insert("rev", value(&git_info.tag.clone()));

            let local_str = local.as_str().ok_or_else(|| {
                anyhow!("Failed to get local dependency path. Found empty path on transitive dependency: {}", local)
            })?;

            let path = PathBuf::from(git_info.path.clone())
                .join(local_str)
                .to_string_lossy()
                .to_string();

            new_source.insert("subdir", value(&path));

            Ok(new_source.into_inline_table())
        })
        .transpose()
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
    mut move_toml: MoveToml,
    package_name: &str,
    network: &Network,
) -> Result<String> {
    let dependencies = MoveRegistryDependencies {
        packages: vec![package_name.to_string()],
    };

    let resolved_packages = query_multiple_dependencies(dependencies.clone(), network).await?;

    // Infer package name to insert.
    let temp_dir = TempDir::new().context("Failed to create temporary directory")?;

    let request_data = resolved_packages.get(package_name).unwrap(); // Invariant: must have resolved

    let (_, (dep_move_toml_path, _)) =
        fetch_package_files(package_name, request_data, &temp_dir).await?;

    let dep_move_toml_content = fs::read_to_string(dep_move_toml_path)?;

    let placeholder_address = ObjectId::from_str(&request_data.package_address)?;

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
    move_toml.add_dependency(&name, &package_name)?;

    move_toml.save_to_file()?;

    let output_msg = format!(
        "{}\nYou can use this dependency in your modules by calling: {}",
        &format!(
            "\nSuccessfully added dependency {} to your Move.toml\n",
            package_name.green()
        ),
        &format!("use {}::<module>;\n", name).green()
    );

    Ok(output_msg)
}

pub async fn subcommand_add_dependency(package_name: &str) -> Result<CommandOutput> {
    let move_toml = MoveToml::new(
        env::current_dir()
            .context("Failed to get current directory")?
            .join("Move.toml"),
    )?;

    let network = get_active_network()?;
    let cmd_output = update_mvr_packages(move_toml, package_name, &network).await?;

    Ok(CommandOutput::Add(cmd_output))
}

/// resolve a .move name to an address. E.g., `nft@sample` => 0x... cf. subcommand_list implementation.
pub async fn subcommand_resolve_name(
    name: &str,
    network: Option<Network>,
) -> Result<CommandOutput> {
    let network = network.unwrap_or(get_active_network()?);
    let package_mainnet = query_package(name, &network).await?;

    Ok(CommandOutput::Resolve(package_mainnet.1))
}

pub async fn subcommand_search_names(
    query: Option<String>,
    limit: Option<u32>,
    cursor: Option<String>,
) -> Result<CommandOutput> {
    let search_results = search_names(query, limit, cursor).await?;

    Ok(CommandOutput::Search(search_results))
}

/// Migrates the lockfile to version 3 from older versions, if necessary.
fn migrate_to_version_three(packages: &mut ArrayOfTables) -> Result<()> {
    for package in packages.iter_mut() {
        // if ID is missing from the core dependency, add it.
        if !package.contains_key(LOCK_PACKAGE_ID_KEY) {
            let name = package
                .get(LOCK_PACKAGE_NAME_KEY)
                .ok_or_else(|| anyhow!("Failed to get name for dependency"))?;
            package.insert(LOCK_PACKAGE_ID_KEY, name.clone());
        }

        // Skip if there are no dependencies or if dependencies are not an array.
        let dependencies = match package
            .get_mut(DEPENDENCIES_KEY)
            .and_then(|v| v.as_array_mut())
        {
            Some(deps) => deps,
            None => continue,
        };

        for dep in dependencies.iter_mut() {
            if let Some(val) = dep.as_inline_table_mut() {
                // Get name, skipping if not found
                let name = val
                    .get(LOCK_PACKAGE_NAME_KEY)
                    .ok_or_else(|| anyhow!("Failed to get name"))?;

                if !val.contains_key(LOCK_PACKAGE_ID_KEY) {
                    val.insert(LOCK_PACKAGE_ID_KEY, name.clone());
                }
            }
        }
    }
    Ok(())
}

fn get_chain_id(network: &Network) -> Result<String> {
    match network {
        Network::Testnet => Ok(TESTNET_CHAIN_ID.to_string()),
        Network::Mainnet => Ok(MAINNET_CHAIN_ID.to_string()),
    }
}
