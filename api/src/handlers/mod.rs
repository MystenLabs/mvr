use axum::http::StatusCode;

pub mod handler;
pub mod package;
pub mod resolution;
pub mod reverse_resolution;

fn network_field(network: &str) -> Result<&str, StatusCode> {
    match network {
        "mainnet" => Ok("mainnet_id"),
        "testnet" => Ok("testnet_id"),
        _ => Err(StatusCode::BAD_REQUEST),
    }
}
