use std::sync::Arc;

use crate::data::app_state::AppState;
use axum::{
    body::Body,
    extract::{MatchedPath, State},
    http::Request,
    middleware::Next,
    response::IntoResponse,
};

// Axum middleware to track metrics
pub(crate) async fn track_metrics(
    State(app): State<Arc<AppState>>,
    req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    let axum_route = req
        .extensions()
        .get::<MatchedPath>()
        .map(|p| p.as_str()) // Gets the route name e.g. `/v1/resolution/{*name}`
        .unwrap_or("UNKNOWN")
        .to_string(); // defaults to UNKNOWN

    // Add the `network` as part of the route. That way both API instances can report
    // metrics for the same route name.
    let route = format!("{}{}", app.network(), axum_route);
    let route_labels = [route.as_str()];

    // check timers too.
    let _guard = app
        .metrics()
        .request_latency
        .with_label_values(&route_labels)
        .start_timer();

    app.metrics()
        .requests_received
        .with_label_values(&route_labels)
        .inc();

    let response = next.run(req).await;
    let status = response.status();

    // save success/failure metrics
    if status.is_success() {
        app.metrics()
            .requests_succeeded
            .with_label_values(&route_labels)
            .inc();
    } else {
        app.metrics()
            .requests_failed
            .with_label_values(&[route.as_str(), status.as_str()])
            .inc();
    }

    response
}
