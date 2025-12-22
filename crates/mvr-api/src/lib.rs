pub(crate) mod data;
pub(crate) mod errors;
pub(crate) mod handlers;
pub(crate) mod metrics;
pub(crate) mod route;
pub(crate) mod utils;

use std::{net::SocketAddr, str::FromStr, sync::Arc};

use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    HeaderName, Method,
};
use clap::ValueEnum;
use data::app_state::AppState;
use mvr_schema::MIGRATIONS;
use prometheus::Registry;
use sui_indexer_alt_metrics::{MetricsArgs, MetricsService};
use sui_pg_db::{Db, DbArgs};
use tokio_util::sync::CancellationToken;
use tower_http::cors::{Any, CorsLayer};
use url::Url;

const MVR_SOURCE_HEADER: &str = "Mvr-Source";

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

    let metrics = MetricsService::new(MetricsArgs { metrics_address }, registry);

    let mvr_source_header = HeaderName::from_str(MVR_SOURCE_HEADER)?;

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([AUTHORIZATION, ACCEPT, CONTENT_TYPE, mvr_source_header]);

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

pub async fn run_migrations(url: Url, args: DbArgs) -> Result<(), anyhow::Error> {
    let db = Db::for_write(url, args).await?;
    db.run_migrations(Some(&MIGRATIONS)).await?;
    Ok(())
}

impl std::fmt::Display for Network {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Network::Mainnet => write!(f, "mainnet"),
            Network::Testnet => write!(f, "testnet"),
        }
    }
}
