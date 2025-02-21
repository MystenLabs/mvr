// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

mod data;
mod errors;
mod handlers;
mod route;

use std::{env, sync::Arc};

use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    Method,
};
use data::app_state::AppState;
use sui_pg_db::DbArgs;
use url::Url;

use dotenvy::dotenv;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    dotenv().ok();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET])
        .allow_headers([AUTHORIZATION, ACCEPT, CONTENT_TYPE]);

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let port = env::var("PORT").unwrap_or("8000".to_string());

    // TODO: Parse from args instead of env, and also allow pool size & timeout configuration!
    let db_args = DbArgs {
        database_url: Url::parse(&db_url).expect("Invalid database URL"),
        db_connection_pool_size: 20,
        connection_timeout_ms: 5000,
    };

    // TODO: Parse `network` from env (now defaults to mainnet)
    let app_state = AppState::new(db_args, "mainnet".to_string()).await.unwrap();

    let app = route::create_router(Arc::new(app_state)).layer(cors);

    println!("🚀 Server started successfully");
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
