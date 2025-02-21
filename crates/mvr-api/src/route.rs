// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::sync::Arc;

use crate::{
    data::app_state::AppState,
    handlers::{health_check, resolution::Resolution, reverse_resolution::ReverseResolution},
};
use axum::{
    routing::{get, post},
    Router,
};

pub fn create_router(app: Arc<AppState>) -> Router {
    let v1 = Router::new()
        .route("/resolution/bulk", post(Resolution::bulk_resolve))
        .route("/resolution/{*name}", get(Resolution::resolve))
        .route(
            "/reverse-resolution/bulk",
            post(ReverseResolution::bulk_resolve),
        )
        .route(
            "/reverse-resolution/{package_id}",
            get(ReverseResolution::resolve),
        );

    Router::new()
        .route("/health", get(health_check))
        .nest("/v1", v1)
        .with_state(app)
}
