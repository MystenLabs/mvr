use std::{collections::HashSet, str::FromStr, sync::Arc};

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use diesel::{
    prelude::*,
    sql_types::{Array, BigInt, Text},
};
use diesel_async::RunQueryDsl;
use serde::{Deserialize, Serialize};

use crate::{types::name::VersionedName, AppState};

use super::network_field;

#[derive(QueryableByName, Debug)]
pub struct NameResolution {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub package_id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub name: String,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub version: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResolutionData {
    pub name: String,
    pub package_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct BulkResolutionData {
    pub names: Vec<String>,
}

impl NameResolution {
    pub async fn resolve(
        Path((network, name)): Path<(String, String)>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<ResolutionData>, StatusCode> {
        // validate the name
        let versioned = VersionedName::from_str(&name).map_err(|_| StatusCode::BAD_REQUEST)?;
        let names = bulk_resolve_names_impl(vec![versioned], &app_state, network).await?;
        Ok(Json(names[0].clone()))
    }

    /// Resolve a list of names at once.
    /// The return order will NOT match the input order
    pub async fn bulk_resolve(
        Path(network): Path<String>,
        State(app_state): State<Arc<AppState>>,
        Json(payload): Json<BulkResolutionData>,
    ) -> Result<Json<Vec<ResolutionData>>, StatusCode> {
        let mut unique_names = HashSet::new();
        for name in payload.names {
            let versioned = VersionedName::from_str(&name).map_err(|_| StatusCode::BAD_REQUEST)?;
            unique_names.insert(versioned);
        }

        let results =
            bulk_resolve_names_impl(unique_names.into_iter().collect(), &app_state, network)
                .await?;
        Ok(Json(results))
    }
}

async fn bulk_resolve_names_impl(
    versioned_names: Vec<VersionedName>,
    app_state: &AppState,
    network: String,
) -> Result<Vec<ResolutionData>, StatusCode> {
    if versioned_names.is_empty() {
        return Ok(vec![]);
    }

    // Gets a list of all the requested names.
    let names: Vec<String> = versioned_names
        .iter()
        .map(|name| name.name.to_string())
        .collect::<Vec<_>>();

    // get a list of requested versions for the given names.
    let versions = versioned_names
        .iter()
        // If a name does not have a version, we use 0, which acts like a "MAX" version.
        .map(|name| name.version.unwrap_or(0) as i64)
        .collect::<Vec<_>>();

    let mut conn = app_state
        .db
        .get()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // This query is a bit complex, but it's a way to bulk-get either the latest OR a specific version
    // for a given list of names.
    // This query, allows also for multiple versions of the same package as part of the same query.
    // The way it works is by joining the
    let result: Vec<NameResolution> = diesel::sql_query(format!(
        "WITH inp AS (
            SELECT unnest($1) AS name, unnest($2) AS version
        ),
        pkg AS (
            SELECT p.original_id, p.package_id, nr.name, i.version
            FROM packages p
            INNER JOIN package_infos pi ON p.package_id = pi.package_id
            INNER JOIN name_records nr ON pi.id = nr.{}
            INNER JOIN inp i ON nr.name = i.name
        )
        SELECT DISTINCT ON (pkg.name, pkg.version) pkg.name, p.package_id, pkg.version
        FROM pkg
        INNER JOIN packages p ON p.original_id = pkg.original_id
        AND (pkg.version = 0 OR p.package_version = pkg.version)
        ORDER BY pkg.name, pkg.version, p.package_version DESC;",
        network_field(&network)?
    ))
    .bind::<Array<Text>, _>(names.clone())
    .bind::<Array<BigInt>, Vec<i64>>(versions)
    .get_results::<NameResolution>(&mut conn)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let results = versioned_names
        .iter()
        .map(|name| {
            let item = result
                .iter()
                .find(|r| {
                    r.name == *name.name.to_string()
                        && r.version == name.version.unwrap_or(0) as i64
                })
                .map(|r| ResolutionData {
                    name: name.to_string(),
                    package_id: Some(r.package_id.clone()),
                })
                .unwrap_or(ResolutionData {
                    name: name.to_string(),
                    package_id: None,
                });
            item
        })
        .collect::<Vec<_>>();

    Ok(results)
}
