use std::sync::Arc;

use crate::{
    handlers::{
        handler::root,
        resolution::NameResolution,
        reverse_resolution::ReverseNameResolution,
    },
    AppState,
};
use axum::{
    routing::{get, post},
    Router,
};

pub fn create_router(app: Arc<AppState>) -> Router {
    let v1 = Router::new()
        .route("/health", get(root))
        .route("/resolution/reverse/bulk", post(ReverseNameResolution::bulk_resolve))
        .route("/resolution/reverse/{package_id}", get(ReverseNameResolution::resolve))
        .route("/resolution/bulk", post(NameResolution::bulk_resolve))
        .route("/resolution/{*name}", get(NameResolution::resolve));

    Router::new().nest("/api/v1", v1).with_state(app)
}
