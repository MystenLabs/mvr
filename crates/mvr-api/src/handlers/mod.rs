// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::sync::Arc;

use axum::{extract::State, http::StatusCode};

use crate::{data::app_state::AppState, errors::ApiError};

pub mod resolution;
pub mod reverse_resolution;

pub(crate) async fn health_check(
    State(app_state): State<Arc<AppState>>,
) -> Result<StatusCode, ApiError> {
    app_state.reader().connect().await.map_err(|_| {
        ApiError::InternalServerError("Failed to get database connection".to_string())
    })?;

    Ok(StatusCode::OK)
}
