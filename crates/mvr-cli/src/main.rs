use mvr::types::resolver_alt::new_package_resolver;

use std::env;

use anyhow::Result;
use clap::Parser;
use mvr::utils::sui_binary::check_sui_version;
use mvr::{commands::Command, constants::MINIMUM_BUILD_SUI_VERSION};

bin_version::bin_version!();

#[derive(Parser)]
#[command(author, version = VERSION, propagate_version = true, about)]
struct Cli {
    #[arg(long, global = true)]
    resolve_deps: bool,

    #[command(subcommand)]
    command: Option<Command>,

    /// Output the result in JSON format
    #[arg(long, global = true)]
    json: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // If we are in the new package resolver, we wanna special handle it and return early.
    if cli.resolve_deps {
        check_sui_version(MINIMUM_BUILD_SUI_VERSION)?;
        new_package_resolver().await?;
        return Ok(());
    }

    if let Some(command) = cli.command {
        let output = command.execute().await?;
        if cli.json {
            println!("{}", serde_json::to_string_pretty(&output)?);
        } else {
            println!("{}", output);
        }
    } else {
        let cli = Cli::parse_from(["mvr", "--help"]);
        if let Some(x) = cli.command {
            let c = x.execute().await?;
            println!("{:?}", c.to_string());
        }
    }

    Ok(())
}
