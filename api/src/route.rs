use std::sync::Arc;

use crate::{
    handlers::{
        handler::root, resolution::NameResolution, reverse_resolution::ReverseResolution,
        type_resolution::TypeResolution,
    },
    AppState,
};
use axum::{
    routing::{get, post},
    Router,
};

pub fn create_router(app: Arc<AppState>) -> Router {
    let v1 = Router::new()
        .nest("/{network}", network_routes())
        .route("/health", get(root));

    Router::new().nest("/api/v1", v1).with_state(app)
}

fn network_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route(
            "/resolution/reverse/bulk",
            post(ReverseResolution::bulk_resolve),
        )
        .route(
            "/resolution/reverse/{package_id}",
            get(ReverseResolution::resolve),
        )
        .route("/resolution/bulk", post(NameResolution::bulk_resolve))
        .route("/resolution/{*name}", get(NameResolution::resolve))
        .route("/type-resolution/bulk", post(TypeResolution::bulk_resolve))
        .route(
            "/type-resolution/{*type_name}",
            get(TypeResolution::resolve),
        )
}
