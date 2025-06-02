use std::sync::Arc;

use axum::{
    extract::State,
    response::{IntoResponse, Response},
};
use chrono::{Duration, Utc};
use diesel::{
    query_dsl::methods::{FilterDsl, SelectDsl},
    BoolExpressionMethods, ExpressionMethods,
};
use tracing::debug;

use crate::{data::app_state::AppState, errors::ApiError};

const MAX_AGE: Duration = Duration::minutes(60);

pub struct Sitemap;

impl Sitemap {
    pub async fn get(State(app_state): State<Arc<AppState>>) -> Result<Response, ApiError> {
        // we acquire a "write" lock, given this endpoint is not
        let read_only_cache = app_state.sitemap_cache().read().await;
        let now = Utc::now();

        if let Some(last_updated) = read_only_cache.last_updated {
            if now - last_updated < MAX_AGE {
                return Ok((
                    [("Content-Type", "application/xml")],
                    read_only_cache.xml.clone(),
                )
                    .into_response());
            }
        }

        // Drop the acquired "read" lock, to proceed with a write lock.
        drop(read_only_cache);

        debug!("Generating sitemap...");
        let mut cache = app_state.sitemap_cache().write().await;
        let sitemap = generate_sitemap(&app_state).await?;

        cache.xml = sitemap.clone();
        cache.last_updated = Some(now);

        Ok(([("Content-Type", "application/xml")], sitemap).into_response())
    }
}

pub async fn generate_sitemap(app_state: &AppState) -> Result<String, ApiError> {
    use mvr_schema::schema::name_records::dsl as nr;

    let mut conn = app_state.reader().connect().await?;

    let names: Vec<String> = conn
        .results(
            nr::name_records.select(nr::name).filter(
                nr::mainnet_id
                    .is_not_null()
                    .or(nr::testnet_id.is_not_null()),
            ),
        )
        .await?;

    let mut body = String::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    "#,
    );

    for name in names {
        body.push_str(&format!(
            r#"<url><loc>https://www.moveregistry.com/package/{}</loc></url>"#,
            name,
        ));
    }

    body.push_str("</urlset>");

    Ok(body)
}
