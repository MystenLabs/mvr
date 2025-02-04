use anyhow::Result;
use clap::Parser;
use mvr::{
    binary_version_check::check_sui_version, commands::Command,
    constants::MINIMUM_BUILD_SUI_VERSION, resolve_move_dependencies,
};

bin_version::bin_version!();

#[derive(Parser)]
#[command(author, version = VERSION, propagate_version = true, about)]
struct Cli {
    #[arg(long)]
    resolve_move_dependencies: Option<String>,

    #[command(subcommand)]
    command: Option<Command>,

    /// Output the result in JSON format
    #[arg(long, global = true)]
    json: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    if let Some(ref value) = cli.resolve_move_dependencies {
        check_sui_version(MINIMUM_BUILD_SUI_VERSION)?;
        // Resolver function that `sui move build` expects to call.
        resolve_move_dependencies(&value).await?;
    } else if let Some(command) = cli.command {
        let output = command.execute().await?;
        if cli.json {
            println!("{}", serde_json::to_string_pretty(&output)?);
        } else {
            println!("{}", output);
        }
    } else {
        let cli = Cli::parse_from(&["mvr", "--help"]);
        match cli.command {
            Some(x) => {
                let c = x.execute().await?;
                println!("{:?}", c.to_string());
            }
            None => {}
        }
    }

    Ok(())
}
