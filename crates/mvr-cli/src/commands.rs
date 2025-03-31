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
use crate::subcommand_resolve_name;
use crate::PackageInfo;
use crate::PackageInfoNetwork;

#[derive(Serialize, Subcommand)]
#[serde()]
pub enum Command {
    /// Add a new dependency from the move registry to your Move.toml file.
    Add {
        name: String,
        #[arg(short, long)]
        network: String,
    },
    /// List every app in the move registry.
    #[clap(hide = true)]
    List {
        /// Filter the list of apps by name (@....).
        #[arg(long)]
        filter: Option<String>,
    },
    /// Resolve the app name to a package info.
    Resolve { name: String },
}

#[derive(Serialize)]
pub enum CommandOutput {
    #[serde(rename = "added_to_toml")]
    Add(String),
    #[serde(rename = "apps")]
    List(Vec<App>),
    Resolve,
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
            Command::List { filter } => subcommand_list(filter).await,
            Command::Resolve { name } => subcommand_resolve_name(&name).await,
        }
    }
}

impl Display for CommandOutput {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        match self {
            CommandOutput::Add(output) => write!(f, "{}", output),
            CommandOutput::List(apps) => {
                if apps.is_empty() {
                    return write!(f, "No registered apps found");
                }
                if apps.len() == 1 {
                    return write!(f, "{}", apps[0]);
                }

                for app in apps {
                    writeln!(
                        f,
                        "-----------------------------------------------------------------------------------------"
                    )?;
                    writeln!(f, "{}", app)?;
                }
                Ok(())
            }
            CommandOutput::Resolve => write!(f, "Resolved"),
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

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::str::FromStr;

    use sui_sdk_types::ObjectId;

    use crate::commands::App;
    use crate::commands::PackageInfo;
    use crate::commands::PackageInfoNetwork;
    use crate::GitInfo;

    #[test]
    fn test_display_app() {
        let app =
            App {
                name: "@mvr/demo".to_string(),
                package_info: vec![(PackageInfoNetwork::Testnet, None),(
                PackageInfoNetwork::Mainnet,
                Some(PackageInfo {
                    package_address: ObjectId::from_str(
                        "0xd94df18bd28e31c65241e2db942920cd6d92f69531b7bff5eccebdaf8fcfc8bf",
                    )
                    .unwrap(),
                    upgrade_cap_id: ObjectId::from_str(
                        "0x764aa368ce52fd7e5612fc6c244b01b0eea232cbdc22a1661785d24e2d252a3e",
                    )
                    .unwrap(),
                    git_versioning: HashMap::from([(
                        1,
                        GitInfo {
                            repository: "https://github.com/MystenLabs/demo-package-for-testing"
                                .to_string(),
                            tag: "main".to_string(),
                            path: "0x7328/demo-mainnet".to_string(),
                        },
                    )]),
                }),
            )],
            };
        let expected = r#" Package:  @mvr/demo 

  [testnet]
     Registered address not found    

  [mainnet]
     Package Address  0xd94df18bd28e31c65241e2db942920cd6d92f69531b7bff5eccebdaf8fcfc8bf 
     Upgrade Cap      0x764aa368ce52fd7e5612fc6c244b01b0eea232cbdc22a1661785d24e2d252a3e 
     Version          1                                                                  
     Repository       https://github.com/MystenLabs/demo-package-for-testing             
     Tag              main                                                               
     Path             0x7328/demo-mainnet                                                
"#;
        let app_str = format!("{}", app);
        assert_eq!(app_str, expected);
    }
}
