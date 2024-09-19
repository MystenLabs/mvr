use anyhow::{anyhow, bail, Context, Result};
use clap::CommandFactory;
use clap::{Parser, Subcommand};
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

use sui_config::{sui_config_dir, SUI_CLIENT_CONFIG};
use sui_sdk::{
    rpc_types::{SuiData, SuiObjectDataOptions, SuiObjectResponse},
    types::{base_types::ObjectID, dynamic_field::DynamicFieldName},
    wallet_context::WalletContext,
    SuiClient, SuiClientBuilder,
};

const APP_REGISTRY_TABLE_ID: &str =
    "0x250b60446b8e7b8d9d7251600a7228dbfda84ccb4b23a56a700d833e221fae4f";
pub const SUI_MAINNET_URL: &str = "https://fullnode.mainnet.sui.io:443";
const TESTNET_CHAIN_ID: &str = "4c78adac";
const MAINNET_CHAIN_ID: &str = "35834a8a";

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[arg(long)]
    resolve_move_dependencies: Option<String>,

    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    Add {
        name: String,
        #[arg(short, long)]
        network: String,
    },
    List,
    Register {
        name: String,
    },
    Resolve {
        name: String,
    },
}

#[derive(Debug, Deserialize, Serialize)]
struct MoveRegistryDependency {
    resolver: String,
    network: String,
    packages: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct MoveToml {
    dependencies: HashMap<String, toml::Value>,
}

#[derive(PartialEq)]
enum PackageInfoNetwork {
    Mainnet,
    Testnet,
}

#[derive(Debug)]
struct PackageInfo {
    upgrade_cap_id: ObjectID,
    package_address: ObjectID,
    git_versioning: HashMap<u64, GitInfo>,
}

#[derive(Debug)]
struct GitInfo {
    repository: String,
    tag: String,
    path: String,
}

impl fmt::Display for PackageInfoNetwork {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PackageInfoNetwork::Mainnet => write!(f, "mainnet"),
            PackageInfoNetwork::Testnet => write!(f, "testnet"),
        }
    }
}

macro_rules! print_package_info {
    ($name_object:expr, $client:expr, $network:expr) => {
        println!("  [{}]", $network);
        if let Some(PackageInfo {
            upgrade_cap_id,
            package_address,
            git_versioning,
        }) = get_package_info(&$name_object, $client, $network).await? {
            println!("  Package Addr: {package_address}");
            println!("  Upgrade Cap : {upgrade_cap_id}");
            for (
                k,
                GitInfo {
                    repository,
                    tag,
                    path,
                },
            ) in git_versioning.iter() {
                println!(
                    "    v{k}\n      Repository: {repository}\n      Tag: {tag}\n      Path: {path}"
                );
            }
        } else {
                println!("    <empty>");
        };
    }
}

/// List the App Registry
async fn list_apps() -> Result<()> {
    let (mainnet_client, testnet_client) = setup_sui_clients().await?;
    let app_registry_id = ObjectID::from_hex_literal(APP_REGISTRY_TABLE_ID)?;
    let mut cursor = None;
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
            println!("{name}");
            print_package_info!(&name_object, &testnet_client, &PackageInfoNetwork::Testnet);
            print_package_info!(&name_object, &mainnet_client, &PackageInfoNetwork::Mainnet);
            println!("");
        }

        if !dynamic_fields.has_next_page {
            break;
        }
        cursor = dynamic_fields.next_cursor;
    }
    Ok(())
}

/// Resolves move registry packages. This function is invoked by `sui move build` and given the
/// a key associated with the external resolution in a Move.toml file. For example, this
/// TOML would trigger sui move build to call this binary and hit this function with value `key`:
///
/// [dependencies.key]
/// resolver = "mvr"
/// network = "mainnet"
/// packages = [ "foo@bar", "baz@qux/v1" ]
///
/// The high-level logic of this function is as follows:
/// 1) Fetch on-chain data for `packages`: the GitHub repository, branch, and subpath
/// 2) Fetches the package dependency graph from the package source (e.g., from GitHub).
/// 3) Constructs the dependency graph represented in the `Move.lock` format and emits it
///    for each package, allow the `sui move build` command to resolve packages from GitHub.
async fn resolve_move_dependencies(key: &str) -> Result<()> {
    let content = fs::read_to_string("Move.toml")?;
    let move_toml: MoveToml = toml::from_str(&content)?;
    let dependency: MoveRegistryDependency = move_toml
        .dependencies
        .get(key)
        .ok_or_else(|| anyhow!("Expected dependency group '{key}' in [dependencies]"))?
        .clone()
        .try_into()
        .map_err(|_| {
            anyhow!("The TOML for external dependency '{key}' doesn't make sense to me")
        })?;
    eprintln!(
        "Resolving key = '{}' for resolver = {}, packages = {:?}",
        key, dependency.resolver, dependency.packages
    );

    let config_path = sui_config_dir()?.join(SUI_CLIENT_CONFIG);
    let context = WalletContext::new(&config_path, None, None)?;
    let client = context.get_client().await?;
    let network = match dependency.network.as_str() {
        "testnet" => &PackageInfoNetwork::Testnet,
        "mainnet" => &PackageInfoNetwork::Mainnet,
        _ => bail!(
            "Unrecognized network {} specified in resolver {key}",
            dependency.network
        ),
    };

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
            let message = format!(
                "Unrecognized chain: expected environment to be either `testnet` or `mainnet`.\n\
                 Consider switching your sui client to an environment that uses one of these chains\n\
                 For example: `sui client switch --env testnet`");
            bail!(message);
        }
    };

    let resolved_packages =
        resolve_on_chain_package_info(&mainnet_client, client, network, &dependency).await?;
    let lock_files = build_lock_files(&resolved_packages).await?;

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
    let package_set: HashSet<String> = dependency.packages.iter().cloned().collect();
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
                    resolved_packages.insert(name, package_info);
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

    Ok(resolved_packages)
}

/// Constructs the dependency graphs for packages, represented in the `Move.lock` format.
/// For a given package `foo`, it fetches `foo`'s `Move.lock` in a source repository.
/// This `Move.lock` contains the transitive dependency graph of `foo`, but not `foo` itself.
/// Since we want to communicate `foo` (and the URL where it can be found) to `sui move build`,
/// we create a dependency graph in the `Move.lock` derived from `foo`'s original lock file
/// that contains `foo`. See `insert_root_dependency` for how this works.
async fn build_lock_files(resolved_packages: &HashMap<String, PackageInfo>) -> Result<Vec<String>> {
    let mut lock_files: Vec<String> = vec![];

    for (name_with_version, package_info) in resolved_packages {
        let (name, version) = parse_package_version(name_with_version)?;
        let git_info = package_info
            .git_versioning
            .get(&version)
            .ok_or_else(|| anyhow!("version {version} does not exist in on-chain PackageInfo"))?;

        let (move_toml_path, move_lock_path) = fetch_move_files(&name, git_info).await?;
        let move_toml_content = fs::read_to_string(move_toml_path)?;
        let move_lock_content = fs::read_to_string(move_lock_path)?;
        // TODO: validation on published ID in either Move.toml or Move.lock
        let root_name_from_source = parse_source_package_name(&move_toml_content)?;
        let lock_with_root =
            insert_root_dependency(&move_lock_content, &root_name_from_source, git_info)?;
        lock_files.push(lock_with_root);

        /* Dummy values that are known to work for an on-chain package */
        /*
        let root_name = parse_source_package_name(&_demo_package_move_toml())?;
        let git_info = &GitInfo {
            repository: "https://github.com/MystenLabs/dot_move.git".into(),
            tag: "ml/migrate-to-plugin".into(),
            path: "packages/demo".into(),
        };
        let lock_with_root = insert_dependency(&_demo_package_move_lock(), &root_name, git_info)?;
        lock_files.push(lock_with_root);
        */
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
    dynamic_field_object
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_data| move_data.fields.field_value("name"))
        .map(|name_field| name_field.to_json_value())
        .and_then(|json_value| {
            json_value
                .get("normalized")
                .and_then(|v| v.as_str())
                .map(String::from)
        })
        .ok_or_else(|| anyhow!("No normalized package name"))
}

fn get_package_info_id(
    dynamic_field: &SuiObjectResponse,
    network: &PackageInfoNetwork,
) -> Result<Option<ObjectID>> {
    let json_value = dynamic_field
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_data| move_data.fields.field_value("value"))
        .map(|value| value.to_json_value())
        .ok_or_else(|| anyhow!("Failed to extract value field as JSON"))?;

    let networks = json_value["networks"]["contents"]
        .as_array()
        .ok_or_else(|| anyhow!("Networks is not an array"))?;

    let network = match network {
        PackageInfoNetwork::Mainnet => "mainnet",
        PackageInfoNetwork::Testnet => "testnet",
    };

    let package_info_id_str = networks
        .iter()
        .find(|entry| entry["key"] == network)
        .and_then(|testnet_entry| testnet_entry["value"]["package_info_id"].as_str());

    match package_info_id_str {
        Some(id_str) => ObjectID::from_hex_literal(id_str)
            .map(Some)
            .map_err(|e| anyhow!("Failed to parse PackageInfo ID: {e}")),
        None => Ok(None),
    }
}

async fn get_package_info(
    name_object: &SuiObjectResponse,
    client: &SuiClient,
    network: &PackageInfoNetwork,
) -> Result<Option<PackageInfo>> {
    let Some(package_info_id) = get_package_info_id(&name_object, network)? else {
        return Ok(None);
    };
    let package_info = get_package_info_by_id(&client, package_info_id).await?;
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
    let git_versioning_id = get_git_versioning_id(&package_info)?;
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
/// Version defaults to 1 otherwise.
fn parse_package_version(name: &str) -> anyhow::Result<(String, u64)> {
    let parts: Vec<&str> = name.split('/').collect();
    match parts.as_slice() {
        [base_name] => Ok((base_name.to_string(), /* default version */ 1)),
        [base_name, version] => {
            let version = version
                .parse::<u64>()
                .map_err(|_| anyhow!("Invalid version {version} for package {name}"))?;
            Ok((base_name.to_string(), version))
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
async fn fetch_move_files(name: &str, git_info: &GitInfo) -> Result<(PathBuf, PathBuf)> {
    let temp_dir = TempDir::new().context("Failed to create temporary directory")?;
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
        Value::InlineTable(table)
    };
    let mut new_deps = Array::new();
    new_deps.push(new_dep);
    move_section["dependencies"] = value(new_deps);

    // Create a new root package entry, set its dependencies to the original top-level dependencies, and persist.
    let mut new_package = Table::new();
    new_package.insert("name", value(root_name));

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

fn _demo_package_move_toml() -> String {
    String::from(
        r#"[package]
name = "demo"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[addresses]
demo = "0x0"

[dev-dependencies]

[dev-addresses]
"#,
    )
}

fn _demo_package_move_lock() -> String {
    String::from(
        r#"# @generated by Move, please check-in and do not edit manually.

[move]
version = 2
manifest_digest = "72EAB20899F5ADF42787258ACEE32F8531E06BB319B82DFA6866FA4807AAC42E"
deps_digest = "F8BBB0CCB2491CA29A3DF03D6F92277A4F3574266507ACD77214D37ECA3F3082"
dependencies = [
  { name = "Sui" },
]

[[move.package]]
name = "MoveStdlib"
source = { git = "https://github.com/MystenLabs/sui.git", rev = "framework/testnet", subdir = "crates/sui-framework/packages/move-stdlib" }

[[move.package]]
name = "Sui"
source = { git = "https://github.com/MystenLabs/sui.git", rev = "framework/testnet", subdir = "crates/sui-framework/packages/sui-framework" }

dependencies = [
  { name = "MoveStdlib" },
]

[move.toolchain-version]
compiler-version = "1.33.0"
edition = "2024.beta"
flavor = "sui"

[env]

[env.testnet]
chain-id = "4c78adac"
original-published-id = "0x2c6aa312fbba13c0184b10a53273b58fda1e9f6119ce8a55fd2d7ea452c56bd8"
latest-published-id = "0x2c6aa312fbba13c0184b10a53273b58fda1e9f6119ce8a55fd2d7ea452c56bd8"
published-version = "1"

[env.mainnet]
chain-id = "35834a8a"
original-published-id = "0x6ad6692327074e360e915401812aa3192e88f6effb02b3d67a970e57dd11f1b0"
latest-published-id = "0x6ad6692327074e360e915401812aa3192e88f6effb02b3d67a970e57dd11f1b0"
published-version = "1""#,
    )
}

fn update_mvr_packages(move_toml_path: &Path, package_name: &str, network: &str) -> Result<()> {
    let toml_content = fs::read_to_string(&move_toml_path)
        .with_context(|| format!("Failed to read file: {:?}", move_toml_path))?;

    let mut doc = toml_content
        .parse::<DocumentMut>()
        .context("Failed to parse TOML content")?;

    if let Some(dependencies) = doc.get_mut("dependencies") {
        let mut mvr_found = false;
        for (_, value) in dependencies
            .as_table_mut()
            .expect("dependencies should be a table")
            .iter_mut()
        {
            if let Some(resolver) = value.get("resolver") {
                if resolver.as_str() == Some("mvr") {
                    mvr_found = true;
                    if let Some(packages) = value.get_mut("packages") {
                        let packages_array = packages
                            .as_array_mut()
                            .expect("packages should be an array");
                        if !packages_array
                            .iter()
                            .any(|p| p.as_str() == Some(package_name))
                        {
                            packages_array.push(package_name);
                        }
                    }
                    break;
                }
            }
        }

        if !mvr_found {
            let mut new_mvr = toml_edit::Table::new();
            new_mvr.insert("resolver", Item::from("mvr"));
            new_mvr.insert("network", Item::from(network));
            let mut packages = Array::new();
            packages.push(package_name);
            new_mvr.insert("packages", value(packages));
            dependencies
                .as_table_mut()
                .expect("dependencies should be a table")
                .insert("mvr", Item::Table(new_mvr));
        }
    } else {
        let mut dependencies = toml_edit::Table::new();
        let mut mvr = toml_edit::Table::new();
        mvr.insert("resolver", Item::from("mvr"));
        mvr.insert("network", Item::from(network));
        let mut packages = Array::new();
        packages.push(package_name);
        mvr.insert("packages", value(packages));
        dependencies.insert("mvr", Item::Table(mvr));
        doc.insert("dependencies", Item::Table(dependencies));
    }

    fs::write(&move_toml_path, doc.to_string())
        .with_context(|| format!("Failed to write to file: {:?}", move_toml_path))?;
    Ok(())
}

/// List the App Registry
async fn subcommand_list() -> Result<()> {
    list_apps().await
}

/// Adds the following TOML for a `package_name` and `network`:
///
/// [dependencies.mvr]
/// resolver = "mvr"
/// network = `network`
/// packages = ["`package_name`" ]
///
/// If a resolver `mvr` already exists, the `package_name` is appended to `packages`.
///
/// Note, some limitations that can improve UX:
/// 1) --network must be supplied. To improve, we can detect the current env.
/// 2) Accept a Move.toml path outside the current directory.
/// 3) Only one entry with a `network` can be exist in the `Move.toml` at a time
async fn subcommand_add_dependency(package_name: &str, network: &str) -> Result<()> {
    if network != "testnet" && network != "mainnet" {
        bail!("network must be one of \"testnet\" or \"mainnet\"");
    }
    let current_dir = env::current_dir().context("Failed to get current directory")?;
    let move_toml_path = current_dir.join("Move.toml");
    if !move_toml_path.exists() {
        return Err(anyhow!("Move.toml not found in the current directory"));
    }
    update_mvr_packages(&move_toml_path, package_name, network)
}

async fn subcommand_register_name(_name: &str) -> Result<()> {
    println!("tbd!");
    Ok(())
}

/// resolve a .move name to an address. E.g., `nft@sample` => 0x... cf. subcommand_list implementation.
async fn subcommand_resolve_name(_name: &str) -> Result<()> {
    println!("tbd!");
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    if let Some(ref value) = cli.resolve_move_dependencies {
        // Resolver function that `sui move build` expects to call.
        resolve_move_dependencies(value).await?;
    } else {
        match &cli.command {
            Some(Commands::Add { name, network }) => {
                subcommand_add_dependency(name, network).await?
            }
            Some(Commands::List) => subcommand_list().await?,
            Some(Commands::Register { name }) => subcommand_register_name(name).await?,
            Some(Commands::Resolve { name }) => subcommand_resolve_name(name).await?,
            None => {
                Cli::command().print_help()?;
            }
        }
    }
    Ok(())
}
