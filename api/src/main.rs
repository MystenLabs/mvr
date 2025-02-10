mod db;
mod handlers;
mod models;
mod route;
mod schema;
mod test;

use std::{env, sync::Arc};

use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    HeaderValue, Method,
};
use db::{get_connection_pool, PgPool};
use dotenvy::dotenv;
use test::seed::seed_database;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    let cors = CorsLayer::new()
        .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET])
        .allow_credentials(true)
        .allow_headers([AUTHORIZATION, ACCEPT, CONTENT_TYPE]);

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let port = env::var("API_PORT").unwrap_or("8000".to_string());

    let app_state = AppState {
        db: get_connection_pool(db_url).await,
    };

    // seed_database(&app_state).await.expect("Failed to seed database");

    let app = route::create_router(Arc::new(app_state)).layer(cors);

    println!("🚀 Server started successfully");
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
