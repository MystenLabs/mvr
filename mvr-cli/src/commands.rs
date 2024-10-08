use std::fmt;
use std::fmt::Display;
use std::fmt::Formatter;

use anyhow::Result;
use clap::Subcommand;
use comfy_table::Row;
use comfy_table::Table;
use serde::Serialize;

use crate::subcommand_add_dependency;
use crate::subcommand_list;
use crate::subcommand_register_name;
use crate::subcommand_resolve_name;
use crate::PackageInfo;
use crate::PackageInfoNetwork;

#[derive(Serialize, Subcommand)]
#[serde()]
pub enum Command {
    Add {
        name: String,
        #[arg(short, long)]
        network: String,
    },
    /// List every app in the move registry.
    List,
    Register {
        name: String,
    },
    /// Resolve a name to an address and show all known related metadata.
    Resolve {
        name: String,
    },
}

#[derive(Serialize)]
pub enum CommandOutput {
    #[serde(rename = "added_to_toml")]
    Add(String),
    #[serde(rename = "apps")]
    List(Vec<App>),
    Register,
    #[serde(rename = "resolved_name")]
    Resolve(Option<App>),
}

#[derive(Serialize)]
pub struct App {
    pub name: String,
    pub package_info: Vec<(PackageInfoNetwork, Option<PackageInfo>)>,
}

impl Command {
    pub async fn execute(self) -> Result<CommandOutput> {
        match self {
            Command::Add { name, network } => subcommand_add_dependency(&name, &network).await,
            Command::List => subcommand_list().await,
            Command::Register { name } => subcommand_register_name(&name).await,
            Command::Resolve { name } => subcommand_resolve_name(&name).await,
        }
    }
}

impl Display for CommandOutput {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        match self {
            CommandOutput::Add(output) => write!(f, "{}", output),
            CommandOutput::List(apps) => {
                for app in apps {
                    writeln!(
                        f,
                        "-----------------------------------------------------------------------------------------"
                    )?;
                    writeln!(f, "{}", app)?;
                }
                Ok(())
            }
            CommandOutput::Register => write!(f, "Registered"),
            CommandOutput::Resolve(app) => {
                if let Some(app) = app {
                    writeln!(f, "{}", app)
                } else {
                    write!(f, "No address found for the given name")
                }
            }
        }
    }
}

impl Display for App {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        let mut package_table = Table::new();
        let name = &self.name;
        package_table
            .load_preset(comfy_table::presets::NOTHING) // Remove borders
            // Add package entry
            .add_row(Row::from(vec!["Package:", name]));

        // Print the package table
        writeln!(f, "{}", package_table)?;

        for (network, package) in self.package_info.iter() {
            writeln!(f, "\n  [{}]", network)?;
            let mut table = Table::new();
            table.load_preset(comfy_table::presets::NOTHING); // Remove borders

            if let Some(package) = package {
                table.add_row(Row::from(vec![
                    "    Package Address",
                    &package.package_address.to_string(),
                ]));
                table.add_row(Row::from(vec![
                    "    Upgrade Cap",
                    &package.upgrade_cap_id.to_string(),
                ]));
                for v in package.git_versioning.iter() {
                    table.add_row(Row::from(vec!["    Version", &v.0.to_string()]));
                    table.add_row(Row::from(vec!["    Repository", &v.1.repository]));
                    table.add_row(Row::from(vec!["    Tag", &v.1.tag]));
                    table.add_row(Row::from(vec!["    Path", &v.1.path]));
                }
            } else {
                table.add_row(Row::from(vec!["    Registered address not found", ""]));
            }
            writeln!(f, "{}", table)?;
        }

        Ok(())
    }
}
