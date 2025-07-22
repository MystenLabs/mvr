use std::{collections::BTreeMap, env, io::stdin, str::FromStr};

use anyhow::Result;
use jsonrpc::types::{BatchRequest, JsonRpcResult, RemoteError, RequestID, Response, TwoPointZero};
use mvr_types::name::VersionedName;
use serde::Deserialize;
use yansi::Paint;

use crate::types::{api_data::query_multiple_dependencies, MoveRegistryDependencies, Network};

#[derive(Deserialize, Debug)]
struct ResolveRequest {
    #[serde(default)]
    // We expect a "chain-id" populated here, or we'll resolve on all known chain ids (mainnet / testnet)
    env: Option<String>,

    // we expect the "data" to be a plain string, being a MVR Name.
    data: String,
}

/// [Experimental]
/// The package-alt resolver for packages.
/// Note: This does not provide validation for "IDs". A `validate` command needs to be implemented
/// for validation of expected IDs to occur.
pub async fn new_package_resolver() -> Result<()> {
    let input = parse_input();
    let mut names = BTreeMap::new();
    let mut per_env = BTreeMap::new();

    for (_, request) in &input {
        let name = VersionedName::from_str(&request.data)?;
        let normalized_network = get_normalized_network(&request.env.clone().unwrap_or_default())?;

        eprintln!(
            "{}: {:?} {} {}",
            "[mvr] RESOLVING".blue(),
            request.data.blue().bold(),
            "ON".blue(),
            normalized_network.blue().bold(),
        );

        names
            .entry(normalized_network)
            .or_insert_with(Vec::new)
            .push(name);
    }

    for (network, names) in &names {
        let response = query_multiple_dependencies(
            MoveRegistryDependencies {
                packages: names.iter().map(|n| n.to_string()).collect(),
            },
            &network,
        )
        .await?;

        per_env.insert(network, response);
    }

    let responses: Vec<Response<serde_json::Value>> = input
        .into_iter()
        .map(|(id, request)| {
            // TODO: properly propagate errors -- we can leave as is for now while we're testing pkg-alt.
            let normalized_network = get_normalized_network(&request.env.unwrap_or_default()).expect("We should have a normalized network error by this point.");
            let map = per_env.get(&normalized_network).expect("No response found for env");

            let Some(response) = map.get(&request.data) else {
                return format_result(id, JsonRpcResult::Err {
                    error: RemoteError { code: 404, message: format!("No name entries found for {}", request.data), data: None } 
                });
            };

            let Some(git_info) = &response.git_info else {
                return format_result(id, JsonRpcResult::Err {
                    error: RemoteError { code: 404, message: format!("Package with name {} does not have git info for env {}", request.data, normalized_network), data: None } 
                });
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

/// Returns the "normalized" network:
/// 1. If the chain-id of the env is known, then we return that.
/// 2. If the chain-id is not known, we try to get the `flag`-based setup.
/// 3. We error with the "original" error.
fn get_normalized_network(env: &str) -> Result<Network> {
    let normalized_network = Network::try_from_chain_identifier(&env);

    if let Ok(normalized_network) = normalized_network {
        return Ok(normalized_network);
    }

    let fallback_network = env::var("MVR_FALLBACK_NETWORK")
        .ok()
        .map(|s| Network::from_str(&s))
        .transpose();

    if let Ok(Some(fallback_network)) = fallback_network {
        return Ok(fallback_network);
    }

    Ok(normalized_network?)
}

fn format_result<T>(id: u64, result: JsonRpcResult<T>) -> Response<T> {
    Response {
        jsonrpc: TwoPointZero,
        id,
        result,
    }
}
