// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

mod data;
mod errors;
mod handlers;
mod metrics;
mod route;

use std::{net::SocketAddr, sync::Arc};

use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    Method,
};
use clap::Parser;
use clap::ValueEnum;
use data::app_state::AppState;
use prometheus::Registry;
use sui_indexer_alt_metrics::{MetricsArgs, MetricsService};
use sui_pg_db::DbArgs;
use tokio_util::sync::CancellationToken;
use tower_http::cors::{Any, CorsLayer};

#[derive(Parser)]
#[clap(rename_all = "kebab-case", author, version)]
struct Args {
    #[command(flatten)]
    db_args: DbArgs,
    #[clap(env, long, default_value = "0.0.0.0:9184")]
    metrics_address: SocketAddr,
    #[clap(long, value_enum, env)]
    network: Network,
    #[clap(long, default_value = "8000", env)]
    api_port: u16,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let _guard = telemetry_subscribers::TelemetryConfig::new()
        .with_env()
        .init();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([AUTHORIZATION, ACCEPT, CONTENT_TYPE]);

    let Args {
        db_args,
        network,
        api_port,
        metrics_address,
    } = Args::parse();

    let cancel = CancellationToken::new();

    let registry = Registry::new_custom(Some("mvr_api".into()), None)
        .expect("Failed to create Prometheus registry.");

    let metrics = MetricsService::new(
        MetricsArgs { metrics_address },
        registry,
        cancel.child_token(),
    );

    let app_state = AppState::new(db_args, network.to_string(), metrics.registry())
        .await
        .expect("Failed to connect to the Database");

    let app = route::create_router(Arc::new(app_state)).layer(cors);

    println!("🚀 Server started successfully on port {}", api_port);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", api_port))
        .await
        .unwrap();

    let _handle = tokio::spawn(async move {
        let _ = metrics.run().await;
    });

    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            cancel.cancelled().await;
        })
        .await?;

    Ok(())
}

#[derive(Debug, Clone, ValueEnum)]
enum Network {
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
