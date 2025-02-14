use std::sync::Arc;

use axum::{extract::State, http::StatusCode};

use crate::{errors::ApiError, AppState};

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

pub(crate) async fn health_check(
    State(app_state): State<Arc<AppState>>,
) -> Result<StatusCode, ApiError> {
    app_state.db.get().await.map_err(|_| {
        ApiError::InternalServerError("Failed to get database connection".to_string())
    })?;

    Ok(StatusCode::OK)
}
