mod data;
mod db;
mod handlers;
mod models;
mod route;
mod schema;
mod seed;
mod types;

use std::{env, sync::Arc};

use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    Method,
};
use data::package_resolver::{ApiPackageStore, PackageResolver};
use db::{get_connection_pool, PgPool};
use dotenvy::dotenv;
use sui_package_resolver::{PackageStoreWithLruCache, Resolver};
use seed::seed::{load_seed_data, seed_database};
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub package_resolver: PackageResolver,
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET])
        .allow_headers([AUTHORIZATION, ACCEPT, CONTENT_TYPE]);

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let port = env::var("API_PORT").unwrap_or("8000".to_string());

    let db = get_connection_pool(db_url).await;

    let api_pkg_resolver = ApiPackageStore::new(db.clone());
    let package_cache = PackageStoreWithLruCache::new(api_pkg_resolver);
    let package_resolver = Arc::new(Resolver::new(package_cache));

    let app_state = AppState {
        db,
        package_resolver,
    };

    // seed_database(&app_state)
    //     .await
    //     .expect("Failed to seed database");
    // load_seed_data(&app_state)
    //     .await
    //     .expect("Failed to load seed data");

    let app = route::create_router(Arc::new(app_state)).layer(cors);

    println!("🚀 Server started successfully");
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
