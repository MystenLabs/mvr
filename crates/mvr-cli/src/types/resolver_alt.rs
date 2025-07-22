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

/// The package-alt resolver for packages.
/// Note: This does not provide validation -- a `validate` command needs to be implemented
/// for validation to happen.
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

        if !names.contains_key(&normalized_network) {
            names.insert(normalized_network, vec![name]);
        } else {
            names.get_mut(&normalized_network).unwrap().push(name);
        }
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
            let env = request.env.unwrap_or_default();
            let normalized_network = get_normalized_network(&env).expect("No normalized network found for env");
            let map = per_env.get(&normalized_network).expect("No response found for env");

            let Some(response) = map.get(&request.data) else {
                return format_result(id, JsonRpcResult::Err {
                    error: RemoteError { code: 404, message: format!("No name entries found for {}", request.data), data: None } 
                });
            };

            let Some(git_info) = &response.git_info else {
                return format_result(id, JsonRpcResult::Err {
                    error: RemoteError { code: 404, message: format!("Package with name {} does not have git info for env {}", request.data, env), data: None } 
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

// Returns the "normalized" network,
// based on the requested env OR the fallback network.
fn get_normalized_network(env: &str) -> Result<Network> {
    let fallback_network = env::var("MVR_FALLBACK_NETWORK")
        .ok()
        .map(|s| Network::from_str(&s))
        .transpose();
    let normalized_network = Network::try_from_chain_identifier(&env);

    if let Ok(normalized_network) = normalized_network {
        return Ok(normalized_network);
    }

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
