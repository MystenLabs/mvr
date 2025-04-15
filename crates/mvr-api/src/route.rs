// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::sync::Arc;

use crate::{
    data::app_state::AppState,
    handlers::{
        health_check, names::Names, package_address::PackageAddress, resolution::Resolution,
        reverse_resolution::ReverseResolution, struct_definition::StructDefinition,
        type_resolution::TypeResolution,
    },
    metrics::middleware::track_metrics,
};
use axum::{
    middleware::from_fn_with_state,
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
        )
        .route("/type-resolution/bulk", post(TypeResolution::bulk_resolve))
        .route(
            "/type-resolution/{*type_name}",
            get(TypeResolution::resolve),
        )
        .route(
            "/struct-definition/bulk",
            post(StructDefinition::bulk_resolve),
        )
        .route(
            "/struct-definition/{*type_name}",
            get(StructDefinition::resolve),
        )
        // TODO: (paginated) Generic name querying, with optional search query.
        .route(
            "/names",
            // Queries all names (paginated & can supply search query)
            get(Names::search_names),
        )
        .route("/names/{*name}", get(Names::get_by_name))
        .route(
            "/package-address/{package_address}/dependencies",
            get(PackageAddress::dependencies),
        )
        .route(
            "/package-address/{package_address}/dependents",
            get(PackageAddress::dependents),
        );

    Router::new()
        .route("/health", get(health_check))
        .nest("/v1", v1)
        .with_state(app.clone())
        .layer(from_fn_with_state(app.clone(), track_metrics))
}
