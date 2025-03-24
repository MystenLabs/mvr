pub(crate) mod data;
pub(crate) mod errors;
pub(crate) mod handlers;
pub(crate) mod metrics;
pub(crate) mod route;

use std::{net::SocketAddr, sync::Arc};

use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    Method,
};
use clap::ValueEnum;
use data::app_state::AppState;
use prometheus::Registry;
use sui_indexer_alt_metrics::{MetricsArgs, MetricsService};
use sui_pg_db::DbArgs;
use tokio_util::sync::CancellationToken;
use tower_http::cors::{Any, CorsLayer};
use url::Url;

pub async fn run_server(
    database_url: Url,
    db_args: DbArgs,
    network: Network,
    api_port: u16,
    cancellation_token: CancellationToken,
    metrics_address: SocketAddr,
) -> Result<(), anyhow::Error> {
    let registry = Registry::new_custom(Some("mvr_api".into()), None)
        .expect("Failed to create Prometheus registry.");

    let metrics = MetricsService::new(
        MetricsArgs { metrics_address },
        registry,
        cancellation_token.clone(),
    );

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([AUTHORIZATION, ACCEPT, CONTENT_TYPE]);

    let app_state = AppState::new(
        database_url,
        db_args,
        network.to_string(),
        metrics.registry(),
    )
    .await
    .expect("Failed to connect to the Database");

    let app = route::create_router(Arc::new(app_state)).layer(cors);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", api_port))
        .await
        .unwrap();

    println!("🚀 Server started successfully on port {}", api_port);

    let _handle = tokio::spawn(async move {
        let _ = metrics.run().await;
    });

    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            cancellation_token.cancelled().await;
        })
        .await?;

    Ok(())
}

#[derive(Debug, Clone, ValueEnum)]
pub enum Network {
    Mainnet,
    Testnet,
}

impl std::fmt::Display for Network {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Network::Mainnet => write!(f, "mainnet"),
            Network::Testnet => write!(f, "testnet"),
        }
    }
}
