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
    sql_types::{Array, Text},
};
use diesel_async::RunQueryDsl;
use serde::{Deserialize, Serialize};
use sui_types::base_types::ObjectID;

use crate::{types::errors::ApiError, AppState};

use super::network_field;

#[derive(QueryableByName, Debug)]
pub struct ReverseNameResolution {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub name: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub package_id: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BulkReverseResolutionData {
    pub package_ids: Vec<ObjectID>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ResolvedName(pub Option<String>);

pub struct ReverseResolution;

impl ReverseResolution {
    pub async fn resolve(
        Path((network, package_id)): Path<(String, ObjectID)>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<ResolvedName>, ApiError> {
        let results = resolve_name_bulk_impl(vec![package_id], &app_state, network).await?;
        // SAFETY: `resolve_name_bulk_impl` always returns the requested elements.
        let result = results.get(&package_id).unwrap();
        Ok(Json(result.clone()))
    }

    pub async fn bulk_resolve(
        Path(network): Path<String>,
        State(app_state): State<Arc<AppState>>,
        Json(payload): Json<BulkReverseResolutionData>,
    ) -> Result<Json<HashMap<ObjectID, ResolvedName>>, ApiError> {
        let unique_pkg_ids: Vec<_> = payload
            .package_ids
            .into_iter()
            .collect::<HashSet<_>>()
            .into_iter()
            .collect();
        let results = resolve_name_bulk_impl(unique_pkg_ids, &app_state, network).await?;
        Ok(Json(results))
    }
}

async fn resolve_name_bulk_impl(
    package_ids: Vec<ObjectID>,
    app_state: &AppState,
    network: String,
) -> Result<HashMap<ObjectID, ResolvedName>, ApiError> {
    if package_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let mut conn = app_state.db.get().await.map_err(|_| {
        ApiError::InternalServerError("Failed to get database connection".to_string())
    })?;

    let query_result = diesel::sql_query(format!(
        "WITH pkg AS (
            SELECT package_id, original_id
            FROM packages
            WHERE package_id = ANY($1)
        )
        SELECT name_records.name, pkg.package_id AS package_id
        FROM package_infos
        INNER JOIN name_records 
            ON package_infos.id = name_records.{}
        INNER JOIN packages
            ON package_infos.package_id = packages.package_id
        INNER JOIN pkg 
            ON (packages.original_id = pkg.original_id OR packages.package_id = pkg.package_id)
        WHERE package_infos.default_name = name_records.name;",
        network_field(&network)?
    ))
    .bind::<Array<Text>, _>(
        package_ids
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>(),
    )
    .get_results::<ReverseNameResolution>(&mut conn)
    .await
    .map_err(|_| ApiError::InternalServerError("Failed to query database".to_string()))?;

    let mut results = query_result
        .into_iter()
        .map(|result| {
            (
                ObjectID::from_str(&result.package_id).unwrap(),
                ResolvedName(Some(result.name)),
            )
        })
        .collect::<HashMap<_, _>>();

    package_ids.iter().for_each(|package_id| {
        results.entry(*package_id).or_insert(ResolvedName(None));
    });

    Ok(results)
}
