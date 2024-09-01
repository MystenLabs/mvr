use clap::{Parser, Subcommand};
use serde::Deserialize;
use std::fs;

use sui_sdk::{
    rpc_types::{DynamicFieldPage, SuiData, SuiObjectDataOptions, SuiObjectResponse},
    types::{base_types::ObjectID, dynamic_field::DynamicFieldName},
    SuiClient, SuiClientBuilder,
};

const APP_REGISTRY_TABLE_ID: &str =
    "0x250b60446b8e7b8d9d7251600a7228dbfda84ccb4b23a56a700d833e221fae4f";
pub const SUI_MAINNET_URL: &str = "https://fullnode.mainnet.sui.io:443";

#[derive(Debug, Deserialize)]
struct Dependency {
    resolver: String,
    packages: Packages,
}

#[derive(Debug, Deserialize)]
struct Packages {
    id: String,
}

#[derive(Debug, Deserialize)]
struct MoveToml {
    dependencies: std::collections::HashMap<String, Dependency>,
}

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
    Register {
        #[arg(short, long)]
        name: String,
    },
    Resolve {
        #[arg(short, long)]
        name: String,
    },
    Add {
        #[arg(short, long)]
        name: String,
    },
}

async fn resolve_move_dependencies(key: &str) -> Result<(), anyhow::Error> {
    eprintln!("[+] `--resolve-move-dependencies` for {}", key);

    let content = fs::read_to_string("Move.toml")?;
    let move_toml: MoveToml = toml::from_str(&content)?;
    let dependency = move_toml
        .dependencies
        .get(key)
        .ok_or_else(|| anyhow::anyhow!("[-] Expected dependency '{}' in [dependencies]", key))?;
    eprintln!(
        "[+] Value for key '{}' using serde: resolver = {}, packages.id = {}",
        key, dependency.resolver, dependency.packages.id
    );

    let (mainnet_client, testnet_client) = setup_sui_clients().await?;
    let parent_object_id = ObjectID::from_hex_literal(APP_REGISTRY_TABLE_ID)?;
    let dynamic_fields = get_dynamic_fields(&mainnet_client, parent_object_id).await?;

    // Go through App Registry and look up normalized name (like `app@org`) for .move packages.
    // XXX loop doesn't for next pages.
    for dynamic_field_info in dynamic_fields.data.into_iter() {
        let dynamic_field =
            get_dynamic_field_object(&mainnet_client, parent_object_id, &dynamic_field_info.name)
                .await?;
        let normalized_name = extract_normalized_value(&dynamic_field)?;

        // Check for a matching name `app@org` name for the dependency.
        if normalized_name != dependency.packages.id {
            // eprintln!("[-] No match for {normalized_name}");
            continue;
        }

        // Get the PackageInfo object ID for this App, then get the PackageInfo object. It tells us where to find git versioning info.
        // XXX hardcoded to resolve for testnet.
        let package_info_id = extract_package_info_id_for_testnet(&dynamic_field)?;
        eprintln!("[+] Found PackageInfo ID for {normalized_name} (testnet): {package_info_id}");
        let testnet_package_info =
            get_testnet_package_info(&testnet_client, package_info_id).await?;

        // Get the git_versioning field and object.
        let git_versioning_id = extract_git_versioning_id(&testnet_package_info)?;
        eprintln!("[+] Found GitInfo ID for {normalized_name} (testnet): {git_versioning_id}");
        let (repository, tag, path) =
            process_git_versioning(&testnet_client, git_versioning_id).await?;
        eprintln!(
            "[+] Git versioning information for {normalized_name}: {repository} | {path} | {tag}"
        );
        // TODO: at this point we need to output the dependency as a TOML graph (conforming to `Move.toml` schema)
        // containing the gir repo / rev / subdirectory.
        //
        // The below function calls a hardcoded example to illustrate, that depends on `packages/demo`.
        // For this to work for real, we need to GitInfo to have those expected values.
        // But! It's not enough to just emit this info single package. Since we are using the
        // external resolver, we need to emit our new dependency's GitInfo and
        // _all its transitive dependencies_ so that the graph is complete.
        //
        // The only straightforward way to know its transitive
        // dependencies (without doing a full build) is to use that package's `Move.lock`.
        // So, right now the thinking is we need a step here that clones the repository and gets the `Move.lock`.
        // If we do that, we might as well ensure it's in the `$HOME/.move` dir so we don't duplicate that work
        // during the build.
        output_move_lock(repository, tag, path);
        break;
    }

    Ok(())
}

async fn setup_sui_clients() -> Result<(SuiClient, SuiClient), anyhow::Error> {
    let mainnet_client = SuiClientBuilder::default().build(SUI_MAINNET_URL).await?;
    let testnet_client = SuiClientBuilder::default().build_testnet().await?;
    Ok((mainnet_client, testnet_client))
}

async fn get_dynamic_fields(
    client: &SuiClient,
    parent_object_id: ObjectID,
) -> Result<DynamicFieldPage, anyhow::Error> {
    client
        .read_api()
        .get_dynamic_fields(parent_object_id, None, None)
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))
}

async fn get_dynamic_field_object(
    client: &SuiClient,
    parent_object_id: ObjectID,
    name: &DynamicFieldName,
) -> Result<SuiObjectResponse, anyhow::Error> {
    client
        .read_api()
        .get_dynamic_field_object(parent_object_id, name.clone())
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))
}

fn extract_normalized_value(dynamic_field: &SuiObjectResponse) -> Result<String, anyhow::Error> {
    dynamic_field
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
        .ok_or_else(|| anyhow::anyhow!("No normalized package name"))
}

fn extract_package_info_id_for_testnet(
    dynamic_field: &SuiObjectResponse,
) -> Result<ObjectID, anyhow::Error> {
    let json_value = dynamic_field
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_data| move_data.fields.field_value("value"))
        .map(|value| value.to_json_value())
        .ok_or_else(|| anyhow::anyhow!("Failed to extract value field as JSON"))?;

    let networks = json_value["networks"]["contents"]
        .as_array()
        .ok_or_else(|| anyhow::anyhow!("Networks is not an array"))?;

    let package_info_id_str = networks
        .iter()
        .find(|entry| entry["key"] == "testnet")
        .and_then(|testnet_entry| testnet_entry["value"]["package_info_id"].as_str())
        .ok_or_else(|| {
            anyhow::anyhow!("Testnet entry or package_info_id not found or not a string")
        })?;

    ObjectID::from_hex_literal(package_info_id_str)
        .map_err(|e| anyhow::anyhow!("Failed to parse package_info_id: {e}"))
}

async fn get_testnet_package_info(
    client: &SuiClient,
    package_info_id: ObjectID,
) -> Result<SuiObjectResponse, anyhow::Error> {
    client
        .read_api()
        .get_object_with_options(package_info_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|e| anyhow::anyhow!("No package info: {e}"))
}

fn extract_git_versioning_id(package_info: &SuiObjectResponse) -> Result<ObjectID, anyhow::Error> {
    let json_value = package_info
        .data
        .as_ref()
        .and_then(|data| data.content.as_ref())
        .and_then(|content| content.try_as_move())
        .and_then(|move_object| move_object.fields.field_value("git_versioning"))
        .map(|git_versioning| git_versioning.to_json_value())
        .ok_or_else(|| anyhow::anyhow!("No git_versioning field"))?;

    let id_str = json_value["id"]["id"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("Expected git_versioning string"))?;

    ObjectID::from_hex_literal(id_str)
        .map_err(|e| anyhow::anyhow!("Invalid git versioning ID: {e}"))
}

async fn process_git_versioning(
    client: &SuiClient,
    git_versioning_id: ObjectID,
) -> Result<(String, String, String), anyhow::Error> {
    let dynamic_fields = client
        .read_api()
        .get_dynamic_fields(git_versioning_id, None, None)
        .await?;

    // XXX accesses only the first value in the table.
    if let Some(dynamic_field_info) = dynamic_fields.data.into_iter().next() {
        let dynamic_field_data = client
            .read_api()
            .get_dynamic_field_object(git_versioning_id, dynamic_field_info.name)
            .await?;
        // XXX unwraps
        let git_info = dynamic_field_data
            .data
            .unwrap()
            .content
            .unwrap()
            .try_as_move()
            .unwrap()
            .fields
            .field_value("value")
            .unwrap()
            .to_json_value();
        let repository = git_info["repository"].as_str().unwrap();
        let tag = git_info["tag"].as_str().unwrap();
        let path = git_info["path"].as_str().unwrap();
        return Ok((repository.to_string(), tag.to_string(), path.to_string()));
    }

    Err(anyhow::anyhow!("No git versioning info found."))
}

fn output_move_lock(_repository: String, _tag: String, _path: String) {
    println!(
        r#"[move]
    version = 2
    manifest_digest = "FC00AD34613F89FA3C198910B13F038355BE91E1943A1F0692CC612EEB4809F8"
    deps_digest = "F8BBB0CCB2491CA29A3DF03D6F92277A4F3574266507ACD77214D37ECA3F3082"
    dependencies = [
      {{ name = "demo" }},
    ]

    [[move.package]]
    name = "demo"
    source = {{ git = "https://github.com/MystenLabs/dot_move.git", rev = "ml/migrate-to-plugin", subdir = "packages/demo" }}

    dependencies = [
      {{ name = "Sui" }},
    ]

    [[move.package]]
    name = "MoveStdlib"
    source = {{ git = "https://github.com/MystenLabs/sui.git", rev = "framework/testnet", subdir = "crates/sui-framework/packages/move-stdlib" }}

    [[move.package]]
    name = "Sui"
    source = {{ git = "https://github.com/MystenLabs/sui.git", rev = "framework/testnet", subdir = "crates/sui-framework/packages/sui-framework" }}

    dependencies = [
      {{ name = "MoveStdlib" }},
    ]
"#
    );
}

async fn subcommand_register_dot_move_name(_name: &str) -> Result<(), anyhow::Error> {
    println!("tbd!");
    Ok(())
}

/// resolve a .move name to an address. E.g., `nft@sample` => 0x2c6aa312fbba13c0184b10a53273b58fda1e9f6119ce8a55fd2d7ea452c56bd8
async fn subcommand_resolve_dot_move_name(_name: &str) -> Result<(), anyhow::Error> {
    println!("tbd!");
    Ok(())
}

async fn subcommand_add_dot_move_dependency(_name: &str) -> Result<(), anyhow::Error> {
    println!("tbd!");
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let cli = Cli::parse();

    if let Some(ref value) = cli.resolve_move_dependencies {
        // Resolver function that `sui move build` expects to call.
        resolve_move_dependencies(value).await?;
    } else {
        match &cli.command {
            Some(Commands::Register { name }) => subcommand_register_dot_move_name(name).await?,
            Some(Commands::Resolve { name }) => subcommand_resolve_dot_move_name(name).await?,
            Some(Commands::Add { name }) => subcommand_add_dot_move_dependency(name).await?,
            None => {
                println!("No subcommand provided");
            }
        }
    }
    Ok(())
}
