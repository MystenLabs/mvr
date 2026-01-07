use anyhow::anyhow;
use anyhow::bail;
use anyhow::Error;
use anyhow::Result;
use regex::Regex;
use serde::Deserialize;
use serde::Serialize;
use std::env;
use std::process::Command;
use std::process::Output;
use std::str::FromStr;
use sui_sdk_types::Address;
use yansi::Paint;

use crate::constants::EnvVariables;
use crate::errors::CliError;
use crate::get_chain_id;
use crate::types::api_types::PackageRequest;
use crate::types::api_types::SafeGitInfo;
use crate::types::Network;

const VERSION_REGEX: &str = r"(\d+)\.(\d+)\.(\d+)";

#[derive(Debug, Serialize, Deserialize, Clone)]
// The result of `cache-package` command
pub struct SuiCachePackageResponse {
    pub name: String,
    #[serde(rename = "published-at")]
    pub published_at: Address,
    #[serde(rename = "original-id")]
    pub original_id: Address,
    pub chain_id: String,
}

/// Check the sui binary's version and print it to the console.
/// This can be used
pub fn check_sui_version(expected_version: (u32, u32)) -> Result<(), Error> {
    let output = sui_command(["--version"].to_vec())?;

    // Check if the command was successful
    if output.status.success() {
        // Convert the stdout (standard output) bytes into a string
        let version_output = String::from_utf8_lossy(&output.stdout);
        let re = Regex::new(VERSION_REGEX)
            .map_err(|_| anyhow!("Failed to get the version of the SUI binary."))?;

        // Search the output for the version number
        if let Some(caps) = re.captures(&version_output) {
            let major_str = caps
                .get(1)
                .ok_or_else(|| anyhow!("Failed to get the major version of the SUI binary."))?
                .as_str();
            let minor_str = caps
                .get(2)
                .ok_or_else(|| anyhow!("Failed to get the minor version of the SUI binary."))?
                .as_str();

            // Extract the major and minor version numbers
            let major: u32 = major_str.parse().map_err(|_| {
                anyhow!("Major version {} of SUI Binary is not a number.", major_str)
            })?;

            let minor: u32 = minor_str.parse().map_err(|_| {
                anyhow!("Minor version {} of SUI Binary is not a number.", minor_str)
            })?;

            assert!(
                major >= expected_version.0 && minor >= expected_version.1,
                "{}",
                &format!(
                    "SUI version is too low. Please upgrade to at least {}.{} in order to build your code using mvr.",
                    &expected_version.0, &expected_version.1
                ),
            );

            eprintln!(
                "{}",
                "[mvr] detected supported SUI CLI version".blue()
            );
        } else {
            eprintln!("Could not find version components in the output.");
        }
    } else {
        // If the command fails, handle the error
        eprintln!(
            "Failed to get version info. Stderr: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
    Ok(())
}

/// Gets the active network by calling `sui client chain-identifier` from the Sui CLI, or falls back
/// to the `MVR_FALLBACK_NETWORK` environment variable for other networks. This is useful for local testing.
///
/// Returns the network as a `Network` enum, or errors if network is not `mainnet` or `testnet`.
pub fn get_active_network() -> Result<Network, Error> {
    let fallback_network = env::var("MVR_FALLBACK_NETWORK");

    let cli_output = sui_command(["client", "chain-identifier"].to_vec())?;

    let chain_id = String::from_utf8_lossy(&cli_output.stdout)
        .trim()
        .to_string();

    let cli_network = Network::try_from_chain_identifier(&chain_id);

    let Ok(cli_network) = cli_network else {
        if fallback_network.is_err() {
            bail!(cli_network.unwrap_err());
        }

        let Ok(fallback) = fallback_network else {
            bail!(cli_network.unwrap_err());
        };

        return Ok(Network::from_str(&fallback)?);
    };

    Ok(cli_network)
}

pub fn cache_package(
    dependency: PackageRequest,
    network: &Network,
) -> Result<SuiCachePackageResponse, Error> {
    let git_info: SafeGitInfo = dependency.get_git_info()?.try_into()?;

    // Make the dependency like this: { git = "...", rev = "...", subdir = "..." }
    let dependency_str = format!(
        "{{ git = \"{}\", rev = \"{}\", subdir = \"{}\" }}",
        git_info.repository_url, git_info.tag, git_info.path
    );
    let network_name = network.to_string();
    let chain_id = get_chain_id(&network)?;

    let cli_output = sui_command(
        [
            "move",
            "cache-package",
            &network_name,
            chain_id.as_str(),
            dependency_str.as_str(),
        ]
        .to_vec(),
    )?;

    let response_str = String::from_utf8_lossy(&cli_output.stdout).to_string();
    let response: SuiCachePackageResponse = serde_json::from_str(&response_str)
        .map_err(|e| CliError::UnexpectedParsing(e.to_string()))?;

    Ok(response)
}

fn sui_command(args: Vec<&str>) -> Result<Output, CliError> {
    let (bin, env) = get_sui_binary();
    Command::new(bin)
        .args(args)
        .output()
        .map_err(|_| CliError::SuiBinaryNotFound(env))
}

fn get_sui_binary() -> (String, String) {
    let env = EnvVariables::SuiBinaryPath.to_string();
    (env::var(env.clone()).unwrap_or("sui".to_string()), env)
}
