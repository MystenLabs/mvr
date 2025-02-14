use crate::types::errors::ApiError;

pub mod handler;
pub mod package;
pub mod resolution;
pub mod reverse_resolution;
pub mod type_resolution;

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
