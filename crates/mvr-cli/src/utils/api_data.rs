use std::{collections::HashMap, str::FromStr};

use ::futures::future::try_join_all;
use anyhow::{bail, Result};
use mvr_types::name::VersionedName;
use sui_sdk_types::ObjectId;

use crate::types::{
    api_types::{PackageRequest, ResolutionResponse},
    MoveRegistryDependencies, Network,
};

const MVR_API_MAINNET_URL: &str = "https://mainnet.mvr.mystenlabs.com";
const MVR_API_TESTNET_URL: &str = "https://testnet.mvr.mystenlabs.com";

/// Query the MVR API to get Package Information by name.
pub async fn query_package(name: &str, network: &Network) -> Result<(String, PackageRequest)> {
    let versioned_name = VersionedName::from_str(name)?;
    let response = reqwest::get(format!(
        "{}/v1/names/{}",
        get_api_url(network)?,
        versioned_name.to_string()
    ))
    .await
    .map_err(|e| anyhow::anyhow!("Failed to query package: {}. Error: {}", name, e))?;

    let body = response
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to resolve package: {}. Error: {}", name, e))?;

    Ok((name.to_string(), body))
}

pub async fn resolve_name(name: &VersionedName, network: &Network) -> Result<ObjectId> {
    let response = reqwest::get(format!(
        "{}/v1/resolution/{}",
        get_api_url(network)?,
        name.to_string()
    ))
    .await?;

    let body: ResolutionResponse = response
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to resolve name: {}. Error: {}", name, e))?;

    Ok(ObjectId::from_str(&body.package_id)?)
}

/// Query the MVR API to get Package Information for multiple dependencies.
pub async fn query_multiple_dependencies(
    deps: MoveRegistryDependencies,
) -> Result<HashMap<String, PackageRequest>> {
    let mut requests = vec![];
    deps.packages.iter().try_for_each(|package| {
        requests.push(query_package(package, &deps.network));
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

fn get_api_url(network: &Network) -> Result<&str> {
    match network {
        Network::Mainnet => Ok(MVR_API_MAINNET_URL),
        Network::Testnet => Ok(MVR_API_TESTNET_URL),
    }
}
