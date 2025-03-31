use std::fmt;
use std::fmt::Display;
use std::fmt::Formatter;

use anyhow::Result;
use clap::Subcommand;

use serde::Serialize;

use crate::subcommand_add_dependency;
use crate::subcommand_list;
use crate::subcommand_resolve_name;
use crate::types::api_types::PackageRequest;
use crate::types::Network;

#[derive(Serialize, Subcommand)]
#[serde()]
pub enum Command {
    /// Add a new dependency from the move registry to your Move.toml file.
    Add {
        name: String,
        #[arg(short, long)]
        network: Option<Network>,
    },
    /// List every app in the move registry.
    #[clap(hide = true)]
    List {
        /// Filter the list of apps by name (@....).
        #[arg(long)]
        filter: Option<String>,
    },
    /// Resolve the app name to a package info.
    Resolve {
        name: String,
        #[arg(short, long)]
        network: Option<Network>,
    },
}

#[derive(Serialize)]
pub enum CommandOutput {
    #[serde(rename = "added_to_toml")]
    Add(String),
    #[serde(rename = "apps")]
    List(Vec<PackageRequest>),
    Resolve,
}

impl Command {
    pub async fn execute(self) -> Result<CommandOutput> {
        match self {
            Command::Add { name, network } => subcommand_add_dependency(&name, network).await,
            Command::List { filter } => subcommand_list(filter).await,
            Command::Resolve { name, network } => subcommand_resolve_name(&name, network).await,
        }
    }
}

impl Display for CommandOutput {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        match self {
            CommandOutput::Add(output) => write!(f, "{}", output),
            CommandOutput::List(packages) => {
                if packages.is_empty() {
                    return write!(f, "No registered packages found");
                }
                if packages.len() == 1 {
                    return write!(f, "{}", packages[0]);
                }

                for package in packages {
                    writeln!(
                        f,
                        "-----------------------------------------------------------------------------------------"
                    )?;
                    writeln!(f, "{}", package)?;
                }
                Ok(())
            }
            CommandOutput::Resolve => write!(f, "Resolved"),
        }
    }
}
