use crate::errors::ApiError;

pub mod app_state;
pub mod package_resolver;
pub mod reader;
pub mod resolution;
pub mod reverse_resolution;

fn network_field(network: &str) -> Result<&str, ApiError> {
    match network {
        "mainnet" => Ok("mainnet_id"),
        "testnet" => Ok("testnet_id"),
        _ => Err(ApiError::BadRequest(format!(
            "Invalid network: {}",
            network
        ))),
    }
}
