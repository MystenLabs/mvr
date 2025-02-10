use std::{collections::HashSet, sync::Arc};

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use diesel::{
    prelude::*,
    sql_types::{Array, Text},
};
use diesel_async::RunQueryDsl;
use serde::{Deserialize, Serialize};

use crate::AppState;

#[derive(QueryableByName, Debug)]
pub struct ReverseNameResolution {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub name: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub package_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReverseResolutionData {
    pub name: Option<String>,
    pub package_id: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BulkReverseResolutionData {
    pub package_ids: Vec<String>,
}

impl ReverseNameResolution {
    pub async fn resolve(
        Path(package_id): Path<String>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<ReverseResolutionData>, StatusCode> {
        let results = resolve_name_bulk_impl(vec![package_id], &app_state).await?;
        Ok(Json(results[0].clone()))
    }
    
    pub async fn bulk_resolve(
        State(app_state): State<Arc<AppState>>,
        Json(payload): Json<BulkReverseResolutionData>,
    ) -> Result<Json<Vec<ReverseResolutionData>>, StatusCode> {
        let unique_pkg_ids: Vec<_> = payload.package_ids.into_iter().collect::<HashSet<_>>().into_iter().collect();
        let results = resolve_name_bulk_impl(unique_pkg_ids, &app_state).await?;
        Ok(Json(results))
    }
}


async fn resolve_name_bulk_impl(
    package_ids: Vec<String>,
    app_state: &AppState,
) -> Result<Vec<ReverseResolutionData>, StatusCode> {
    if package_ids.is_empty() {
        return Ok(vec![]);
    }

    let mut conn = app_state
        .db
        .get()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let results = diesel::sql_query(
        "WITH pkg AS (
            SELECT package_id, original_id
            FROM packages
            WHERE package_id = ANY($1)
        )
        SELECT name_records.name, pkg.package_id AS package_id
        FROM package_infos
        INNER JOIN name_records 
            ON package_infos.id = name_records.mainnet_id
        INNER JOIN packages
            ON package_infos.package_id = packages.package_id
        INNER JOIN pkg 
            ON (packages.original_id = pkg.original_id OR packages.package_id = pkg.package_id)
        WHERE package_infos.default_name = name_records.name;",
    )
    .bind::<Array<Text>, _>(package_ids.clone())
    .get_results::<ReverseNameResolution>(&mut conn)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let results = package_ids
        .iter()
        .map(|package_id| {
            let item = results
                .iter()
                .find(|r| r.package_id == *package_id)
                .map(|r| ReverseResolutionData {
                    name: Some(r.name.clone()),
                    package_id: package_id.clone(),
                })
                .unwrap_or(ReverseResolutionData {
                    name: None,
                    package_id: package_id.clone(),
                });
            item
        })
        .collect::<Vec<_>>();

    Ok(results)
}
