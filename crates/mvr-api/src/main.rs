// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

mod data;
mod errors;
mod handlers;
mod route;

use std::sync::Arc;

use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    Method,
};
use clap::Parser;
use clap::ValueEnum;
use data::app_state::AppState;
use sui_pg_db::DbArgs;
use tower_http::cors::{Any, CorsLayer};

#[derive(Parser)]
#[clap(rename_all = "kebab-case", author, version)]
struct Args {
    #[command(flatten)]
    db_args: DbArgs,
    #[clap(long, value_enum, env)]
    network: Network,
    #[clap(long, default_value = "8000", env)]
    api_port: u16,
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([AUTHORIZATION, ACCEPT, CONTENT_TYPE]);

    let Args {
        db_args,
        network,
        api_port,
    } = Args::parse();

    let app_state = AppState::new(db_args, network.to_string())
        .await
        .expect("Failed to connect to the Database");

    let app = route::create_router(Arc::new(app_state)).layer(cors);

    println!("🚀 Server started successfully on port {}", api_port);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", api_port))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
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
