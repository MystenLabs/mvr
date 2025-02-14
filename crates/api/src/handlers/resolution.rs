use std::{
    collections::{HashMap, HashSet},
    str::FromStr,
    sync::Arc,
};

use axum::{
    extract::{Path, State},
    Json,
};
use diesel::{
    prelude::*,
    sql_types::{Array, BigInt, Text},
};
use diesel_async::RunQueryDsl;
use mvr_types::name::VersionedName;
use serde::{Deserialize, Serialize};
use sui_types::base_types::ObjectID;

use crate::{errors::ApiError, AppState};

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

#[derive(Serialize, Deserialize)]
pub struct BulkResolutionData {
    pub names: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ResolvedName(pub(crate) Option<ObjectID>);

pub struct Resolution;

impl Resolution {
    pub async fn resolve(
        Path((network, name)): Path<(String, String)>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<ResolvedName>, ApiError> {
        let names = bulk_resolve_names_impl(&app_state, vec![name.clone()], network).await?;

        let name = names.get(&name).unwrap().clone();
        Ok(Json(name))
    }

    /// Resolve a list of names at once.
    /// The return order will NOT match the input order
    pub async fn bulk_resolve(
        Path(network): Path<String>,
        State(app_state): State<Arc<AppState>>,
        Json(payload): Json<BulkResolutionData>,
    ) -> Result<Json<HashMap<String, ResolvedName>>, ApiError> {
        let results = bulk_resolve_names_impl(&app_state, payload.names, network).await?;

        Ok(Json(results))
    }
}

pub(crate) async fn bulk_resolve_names_impl(
    app_state: &AppState,
    names: Vec<String>,
    network: String,
) -> Result<HashMap<String, ResolvedName>, ApiError> {
    if names.is_empty() {
        return Ok(HashMap::new());
    }

    // deduplicate names
    let versioned_names = names
        .into_iter()
        .map(|name| VersionedName::from_str(&name))
        .collect::<Result<HashSet<_>, _>>()?
        .into_iter()
        .collect::<Vec<_>>();

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

    let mut conn = app_state.db.get().await.map_err(|_| {
        ApiError::InternalServerError("Failed to get database connection".to_string())
    })?;

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
    .map_err(|_| ApiError::InternalServerError("Failed to query database".to_string()))?;

    let mut results: HashMap<String, ResolvedName> = result
        .into_iter()
        .map(|name| {
            let mut versioned_name = VersionedName::from_str(&name.name)?;
            versioned_name.version = (name.version > 0).then_some(name.version as u64);

            let object_id = ObjectID::from_str(&name.package_id).map_err(|e| {
                ApiError::BadRequest(format!(
                    "Failed to parse package id: {e} {}",
                    name.package_id
                ))
            })?;

            Ok((versioned_name.to_string(), ResolvedName(Some(object_id))))
        })
        .collect::<Result<_, ApiError>>()?;

    versioned_names.iter().for_each(|name| {
        results
            .entry(name.to_string())
            .or_insert(ResolvedName(None));
    });

    Ok(results)
}
