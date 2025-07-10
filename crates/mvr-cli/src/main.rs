use std::collections::BTreeMap;
use std::io::stdin;

use anyhow::Result;
use clap::Parser;
use mvr::utils::sui_binary::check_sui_version;
use mvr::{commands::Command, constants::MINIMUM_BUILD_SUI_VERSION, resolve_move_dependencies};
use mvr_types::name::VersionedName;
use serde::Deserialize;

use jsonrpc::types::{BatchRequest, JsonRpcResult, RequestID, Response};
bin_version::bin_version!();

#[derive(Parser)]
#[command(author, version = VERSION, propagate_version = true, about)]
struct Cli {
    #[arg(long)]
    resolve_move_dependencies: Option<String>,

    #[arg(long)]
    resolve_deps: Option<String>,

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
        eprintln!("Resolving move dependencies for {}", value);
        resolve_move_dependencies(&value).await?;
    } else if let Some(ref resolve_deps) = cli.resolve_deps {
        eprintln!("Resolving move dependencies for {}", resolve_deps);
        let input = parse_input();
        eprintln!("input: {:?}", input);

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

/// Read a [Request] from [stdin]
fn parse_input() -> BTreeMap<RequestID, ResolveRequest> {
    let mut line = String::new();
    stdin().read_line(&mut line).expect("stdin can be read");

    eprintln!("resolver stdin:\n{line}");

    let batch: BatchRequest<ResolveRequest> = serde_json::from_str(&line)
        .expect("External resolver must be passed a JSON RPC batch request");

    batch
        .into_iter()
        .map(|req| {
            assert!(req.method == "resolve");
            (req.id, req.params)
        })
        .collect()
}

#[derive(Deserialize, Debug)]
struct ResolveRequest {
    #[serde(default)]
    // We expect a "chain-id" populated here, or we'll resolve on all known chain ids (mainnet / testnet)
    env: Option<String>,

    // we expect the "data" to be a plain string, being a MVR Name.
    data: VersionedName,
}

#[derive(Deserialize)]
struct Exit {
    stdout: String,

    #[serde(default)]
    stderr: Option<String>,

    #[serde(default)]
    exit_code: Option<i32>,
}

#[derive(Deserialize)]
struct EchoRequest {
    output: BTreeMap<String, JsonRpcResult<serde_json::Value>>,

    #[serde(default)]
    stderr: Option<String>,
}
