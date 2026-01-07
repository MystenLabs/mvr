use std::fmt;
use std::fmt::Display;
use std::fmt::Formatter;
use yansi::Paint;

use anyhow::Result;
use clap::Subcommand;

use serde::Serialize;

use crate::subcommand_add_dependency;
use crate::subcommand_resolve_name;
use crate::subcommand_search_names;
use crate::types::api_types::PackageRequest;
use crate::types::api_types::SearchNamesResponse;
use crate::types::Network;

#[derive(Serialize, Subcommand)]
#[serde()]
pub enum Command {
    /// Add a new dependency from the move registry to your Move.toml file.
    Add { name: String },
    /// Resolve the app name to a package info.
    Resolve {
        name: String,
        #[arg(short, long)]
        network: Option<Network>,
    },
    /// Search for an app in the move registry.
    Search {
        /// Your search query. Expects a partial package name or description.
        /// To lookup for a given organization, use `@<organization_name>/`.
        query: Option<String>,
        /// The number of results to return. Default is 10, maximum is 50.
        #[arg(short, long)]
        limit: Option<u32>,
        /// The cursor to paginate through the results. Defaults to the first page.
        #[arg(short, long)]
        cursor: Option<String>,
    },
}

#[derive(Serialize)]
pub enum CommandOutput {
    #[serde(rename = "added_to_toml")]
    Add(String),
    Resolve(PackageRequest),
    Search(SearchNamesResponse),
}

impl Command {
    pub async fn execute(self) -> Result<CommandOutput> {
        match self {
            Command::Add { name } => subcommand_add_dependency(&name).await,
            Command::Resolve { name, network } => subcommand_resolve_name(&name, network).await,
            Command::Search {
                query,
                limit,
                cursor,
            } => subcommand_search_names(query, limit, cursor).await,
        }
    }
}

impl Display for CommandOutput {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        match self {
            CommandOutput::Add(output) => write!(f, "{}", output),
            CommandOutput::Resolve(package) => {
                writeln!(f, "{}", serde_json::to_string_pretty(&package).unwrap())?;
                Ok(())
            }
            CommandOutput::Search(search_results) => {
                for pkg in search_results.data.iter() {
                    let description = pkg
                        .metadata
                        .get("description")
                        .and_then(|s| s.as_str())
                        .map(|s| s.to_string())
                        .unwrap_or("--".italic().to_string());

                    let mut available_networks = vec![];

                    if pkg.mainnet_package_info_id.is_some() {
                        available_networks.push("mainnet".to_string());
                    }

                    if pkg.testnet_package_info_id.is_some() {
                        available_networks.push("testnet".to_string());
                    }

                    writeln!(f, "\n- {}", &pkg.name.green().bold())?;
                    writeln!(f, "# {}", description.italic())?;
                    writeln!(f, "Networks: {}", available_networks.join(", "))?;
                }

                writeln!(
                    f,
                    "{}",
                    format!(
                        "\nTip: You can find more information about a package by using: {}",
                        "mvr resolve <name>".blue()
                    )
                )?;

                if let Some(next_cursor) = &search_results.next_cursor {
                    writeln!(
                        f,
                        "\n{}",
                        "There are multiple pages of results. Use the cursor to paginate through the results."
                            .italic()
                    )?;
                    writeln!(
                        f,
                        "{}",
                        format!("mvr search <query> --cursor {}", next_cursor)
                            .italic()
                            .blue()
                    )?;
                }

                Ok(())
            }
        }
    }
}
