use mvr::types::{MoveRegistryDependencies, Network};
use mvr::utils::api_data::query_multiple_dependencies;
use yansi::Paint;
use std::collections::BTreeMap;
use std::env;
use std::io::stdin;
use std::str::FromStr;

use anyhow::Result;
use clap::Parser;
use mvr::utils::sui_binary::check_sui_version;
use mvr::{commands::Command, constants::MINIMUM_BUILD_SUI_VERSION, resolve_move_dependencies};
use mvr_types::name::VersionedName;
use serde::Deserialize;

use jsonrpc::types::{BatchRequest, JsonRpcResult, RemoteError, RequestID, Response, TwoPointZero};

bin_version::bin_version!();

#[derive(Parser)]
#[command(author, version = VERSION, propagate_version = true, about)]
struct Cli {
    #[arg(long)]
    resolve_move_dependencies: Option<String>,

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
        let _ = new_package_resolver().await?;
        return Ok(());
    }

    if let Some(ref value) = cli.resolve_move_dependencies {
        check_sui_version(MINIMUM_BUILD_SUI_VERSION)?;
        // Resolver function that `sui move build` expects to call.
        eprintln!("Resolving move dependencies for {}", value);
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

/// Read a [Request] from [stdin]
fn parse_input() -> BTreeMap<RequestID, ResolveRequest> {
    let mut line = String::new();
    stdin().read_line(&mut line).expect("stdin can be read");

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
    data: String,
}

async fn new_package_resolver() -> Result<()> {
    let input = parse_input();

    let mut names = BTreeMap::new();
    let mut per_env = BTreeMap::new();

    for (_, request) in &input {
        let name = VersionedName::from_str(&request.data)?;
        let network = request.env.clone().unwrap_or_default();
        let normalized_network = Network::try_from_chain_identifier(&network)?;

        eprintln!(
            "{}: {:?} {} {}",
            "[mvr] RESOLVING".blue(),
            request.data.blue().bold(),
            "ON".blue(),
            normalized_network.blue().bold(),
        );

        if !names.contains_key(&network) {
            names.insert(network, vec![name]);
        } else {
            names.get_mut(&network).unwrap().push(name);
        }
    }

    for (network, names) in &names {
        let response = query_multiple_dependencies(
            MoveRegistryDependencies {
                packages: names.iter().map(|n| n.to_string()).collect(),
            },
            &Network::try_from_chain_identifier(&network)?,
        )
        .await?;

        per_env.insert(network, response);
    }

    let responses: Vec<Response<serde_json::Value>> = input
        .into_iter()
        .map(|(id, request)| {

            let env = request.env.unwrap_or_default();
            let map = per_env.get(&env).expect("No response found for env");

            let Some(response) = map.get(&request.data) else {
                return format_result(id, JsonRpcResult::Err { 
                    error: RemoteError { code: 404, message: format!("No name entries found for {}", request.data), data: None } },
                );
            };

            let Some(git_info) = &response.git_info else {
                return format_result(id, JsonRpcResult::Err { 
                    error: RemoteError { code: 404, message: format!("Package with name {} does not have git info for env {}", request.data, env), data: None } },
                );
            };

            format_result(id, JsonRpcResult::Ok {
                result: serde_json::json!({ "git": git_info.repository_url, "rev": git_info.tag, "subdir": git_info.path })
            })
        })
        .collect();

    let json = serde_json::to_string(&responses).unwrap_or_default();

    println!("{json}");
    Ok(())
}


fn format_result<T>(id: u64, result: JsonRpcResult<T>) -> Response<T> {
    Response {
        jsonrpc: TwoPointZero,
        id,
        result,
    }
}
