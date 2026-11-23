use std::{collections::BTreeSet, sync::Arc};

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

/// The base URL of the web app (the sitemap is served for it).
const BASE_URL: &str = "https://www.moveregistry.com";

/// The static (non data-driven) pages of the web app.
const STATIC_PAGES: [&str; 4] = ["/", "/orgs", "/faq", "/terms"];

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

    Ok(render_sitemap(&names))
}

/// Renders the sitemap for the static pages, the org pages (one for each org that has
/// at least one of the supplied names), and the package pages of the supplied names.
fn render_sitemap(names: &[String]) -> String {
    // Names are stored as `{org}/{app}`, so the org is everything before the first `/`.
    let orgs: BTreeSet<&str> = names
        .iter()
        .filter_map(|name| name.split_once('/').map(|(org, _)| org))
        .collect();

    let mut body = String::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    "#,
    );

    for page in STATIC_PAGES {
        body.push_str(&format!(r#"<url><loc>{}{}</loc></url>"#, BASE_URL, page));
    }

    for org in orgs {
        body.push_str(&format!(
            r#"<url><loc>{}/org/{}</loc></url>"#,
            BASE_URL, org
        ));
    }

    for name in names {
        body.push_str(&format!(
            r#"<url><loc>{}/package/{}</loc></url>"#,
            BASE_URL, name,
        ));
    }

    body.push_str("</urlset>");

    body
}

#[cfg(test)]
mod tests {
    use super::render_sitemap;

    #[test]
    fn sitemap_contents() {
        let names = ["@b/two", "sub@a/app", "@a/one", "@b/one"].map(String::from);
        let xml = render_sitemap(&names);

        let locs: Vec<&str> = xml
            .split("<loc>")
            .skip(1)
            .map(|part| part.split_once("</loc>").unwrap().0)
            .collect();

        assert_eq!(
            locs,
            vec![
                "https://www.moveregistry.com/",
                "https://www.moveregistry.com/orgs",
                "https://www.moveregistry.com/faq",
                "https://www.moveregistry.com/terms",
                "https://www.moveregistry.com/org/@a",
                "https://www.moveregistry.com/org/@b",
                "https://www.moveregistry.com/org/sub@a",
                "https://www.moveregistry.com/package/@b/two",
                "https://www.moveregistry.com/package/sub@a/app",
                "https://www.moveregistry.com/package/@a/one",
                "https://www.moveregistry.com/package/@b/one",
            ]
        );
    }
}
