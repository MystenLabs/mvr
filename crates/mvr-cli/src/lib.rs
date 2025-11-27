pub mod commands;
pub mod constants;
pub mod errors;
pub mod types;
pub mod utils;

use crate::types::api_data::{query_multiple_dependencies, query_package, search_names};
use crate::utils::sui_binary::cache_package;

use commands::CommandOutput;
use types::Network;

use types::MoveRegistryDependencies;
use utils::manifest::MoveToml;
use utils::sui_binary::get_active_network;

use std::env;

use anyhow::{Context, Result};
use yansi::Paint;

const TESTNET_CHAIN_ID: &str = "4c78adac";
const MAINNET_CHAIN_ID: &str = "35834a8a";

async fn update_mvr_packages(
    mut move_toml: MoveToml,
    package_name: &str,
    network: &Network,
) -> Result<String> {
    let dependencies = MoveRegistryDependencies {
        packages: vec![package_name.to_string()],
    };

    let resolved_packages = query_multiple_dependencies(dependencies.clone(), network).await?;

    let package_request = resolved_packages
        .get(package_name)
        .expect("[mvr invariant] Package must exist in resolved packages.");

    let cached_package = cache_package(package_request.clone(), network)?;

    move_toml.add_dependency(&cached_package.name, package_name)?;

    move_toml.save_to_file()?;

    let output_msg = format!(
        "{}\nYou can use this dependency in your modules by calling: {}",
        &format!(
            "\nSuccessfully added dependency {} to your Move.toml\n",
            package_name.green()
        ),
        &format!("use {}::<module>;\n", cached_package.name).green()
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

fn get_chain_id(network: &Network) -> Result<String> {
    match network {
        Network::Testnet => Ok(TESTNET_CHAIN_ID.to_string()),
        Network::Mainnet => Ok(MAINNET_CHAIN_ID.to_string()),
    }
}
