use anyhow::Result;
use clap::CommandFactory;
use clap::{Parser, Subcommand};
use mvr::helpers::constants::MINIMUM_BUILD_SUI_VERSION;
use mvr::helpers::sui::check_sui_version;
use mvr::{
    resolve_move_dependencies, subcommand_add_dependency, subcommand_list,
    subcommand_register_name, subcommand_resolve_name, Command, CommandOutput,
};

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[arg(long)]
    resolve_move_dependencies: Option<String>,

    #[command(subcommand)]
    command: Command,

    /// Output the result in JSON format
    #[arg(long, global = true)]
    json: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    if let Some(ref value) = cli.resolve_move_dependencies {
        check_sui_version(MINIMUM_BUILD_SUI_VERSION);
        // Resolver function that `sui move build` expects to call.
        resolve_move_dependencies(value).await?;
    } else {
        let output = cli.command.execute().await?;
        if cli.json {
            println!("{}", serde_json::to_string(&output)?);
        } else {
            println!("{}", output);
        }
    }
    Ok(())
}
