use anyhow::Result;
use clap::CommandFactory;
use clap::{Parser, Subcommand};
use mvr::{
    resolve_move_dependencies, subcommand_add_dependency, subcommand_list,
    subcommand_register_name, subcommand_resolve_name,
};

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
    Add {
        name: String,
        #[arg(short, long)]
        network: String,
    },
    List,
    Register {
        name: String,
    },
    Resolve {
        name: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    if let Some(ref value) = cli.resolve_move_dependencies {
        // Resolver function that `sui move build` expects to call.
        resolve_move_dependencies(value).await?;
    } else {
        match &cli.command {
            Some(Commands::Add { name, network }) => {
                subcommand_add_dependency(name, network).await?
            }
            Some(Commands::List) => subcommand_list().await?,
            Some(Commands::Register { name }) => subcommand_register_name(name).await?,
            Some(Commands::Resolve { name }) => subcommand_resolve_name(name).await?,
            None => {
                Cli::command().print_help()?;
            }
        }
    }
    Ok(())
}
