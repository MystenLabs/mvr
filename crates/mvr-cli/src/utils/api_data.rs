use std::{collections::HashMap, str::FromStr};

use ::futures::future::try_join_all;
use anyhow::{bail, Result};
use mvr_types::name::VersionedName;
use reqwest::Client;
use sui_sdk_types::ObjectId;

use crate::{
    errors::CliError,
    types::{
        api_types::{PackageRequest, ResolutionResponse, SearchNamesResponse},
        MoveRegistryDependencies, Network,
    },
};

const MVR_API_MAINNET_URL: &str = "https://mainnet.mvr.mystenlabs.com";
const MVR_API_TESTNET_URL: &str = "https://testnet.mvr.mystenlabs.com";

const DEFAULT_LIMIT: u32 = 10;

/// Query the MVR API to get Package Information by name.
pub async fn query_package(name: &str, network: &Network) -> Result<(String, PackageRequest)> {
    let versioned_name = VersionedName::from_str(name)?;
    let response = reqwest::get(format!(
        "{}/v1/names/{}",
        get_api_url(network)?,
        versioned_name.to_string()
    ))
    .await
    .map_err(|e| CliError::Querying(e.to_string()))?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        bail!(CliError::NameNotExists(
            name.to_string(),
            network.to_string()
        ));
    }

    let body = response
        .json()
        .await
        .map_err(|e| CliError::UnexpectedParsing(e.to_string()))?;

    Ok((name.to_string(), body))
}

pub async fn resolve_name(name: &VersionedName, network: &Network) -> Result<ObjectId> {
    let response = reqwest::get(format!(
        "{}/v1/resolution/{}",
        get_api_url(network)?,
        name.to_string()
    ))
    .await
    .map_err(|e| CliError::Querying(e.to_string()))?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        bail!(CliError::NameNotExists(
            name.to_string(),
            network.to_string()
        ));
    }

    let body: ResolutionResponse = response
        .json()
        .await
        .map_err(|e| CliError::UnexpectedParsing(e.to_string()))?;

    Ok(ObjectId::from_str(&body.package_id)?)
}

/// Query the MVR API to get Package Information for multiple dependencies.
pub async fn query_multiple_dependencies(
    deps: MoveRegistryDependencies,
    network: &Network,
) -> Result<HashMap<String, PackageRequest>> {
    let mut requests = vec![];
    deps.packages.iter().try_for_each(|package| {
        requests.push(query_package(package, network));
        Ok::<(), anyhow::Error>(())
    })?;

    let package_requests =
        try_join_all(requests)
            .await?
            .iter()
            .fold(HashMap::new(), |mut acc, (name, response)| {
                acc.insert(name.clone(), response.clone());
                acc
            });

    // check if all packages were resolved
    if package_requests.len() != deps.packages.len() {
        // find diff
        let diff = deps.packages.len() - package_requests.len();
        let diff_packages = deps
            .packages
            .iter()
            .filter(|p| !package_requests.contains_key(*p))
            .map(|p| p.as_str())
            .collect::<Vec<_>>();
        bail!(
            "Failed to resolve all packages. Missing {} packages: {}",
            diff,
            diff_packages.join(", ")
        );
    }

    Ok(package_requests)
}

/// Given a search query (and limit, cursor optionally),
/// returns a paginated list of names that match the query.
///
/// # Arguments
///
/// * `search` - The search query.
/// * `limit` - The limit of results to return. Maximum is 50, default is 10.
/// * `cursor` - The cursor to paginate through the results.
pub async fn search_names(
    search: Option<String>,
    limit: Option<u32>,
    cursor: Option<String>,
) -> Result<SearchNamesResponse> {
    let mut params = HashMap::new();
    params.insert("limit", limit.unwrap_or(DEFAULT_LIMIT).to_string());

    if let Some(search) = search {
        params.insert("search", search);
    }

    if let Some(cursor) = cursor {
        params.insert("cursor", cursor);
    }

    let client = Client::new();

    let response = client
        .get(format!("{}/v1/names", get_api_url(&Network::Mainnet)?,))
        .query(&params)
        .send()
        .await
        .map_err(|e| CliError::Querying(e.to_string()))?;

    let body = response
        .json::<SearchNamesResponse>()
        .await
        .map_err(|e| CliError::UnexpectedParsing(e.to_string()))?;

    Ok(body)
}

fn get_api_url(network: &Network) -> Result<&str> {
    match network {
        Network::Mainnet => Ok(MVR_API_MAINNET_URL),
        Network::Testnet => Ok(MVR_API_TESTNET_URL),
    }
}
