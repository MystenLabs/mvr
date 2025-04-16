use std::{str::FromStr, sync::Arc};

use axum::{
    extract::{Path, Query, State},
    Json,
};
use diesel::{
    prelude::QueryableByName,
    sql_types::{Integer, VarChar},
};
use mvr_types::name::VersionedName;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sui_sdk_types::ObjectId;

use crate::{
    data::{
        app_state::AppState,
        package_by_name_loader::{PackageByNameBaseData, PackageByNameKey},
        resolution_loader::ResolutionKey,
    },
    errors::ApiError,
    utils::pagination::{format_paginated_response, Cursor, PaginatedResponse, PaginationLimit},
};

#[derive(Serialize, Deserialize)]
pub struct PackageByNameResponse {
    #[serde(flatten)]
    pub package_by_name_data: PackageByNameBaseData,
    pub version: i64,
    pub package_address: ObjectId,
}

#[derive(Serialize, Deserialize, QueryableByName)]
pub struct NameSearchResponse {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub name: String,
    #[diesel(sql_type = diesel::sql_types::Jsonb)]
    pub metadata: Value,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub mainnet_package_info_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub testnet_package_info_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NameSearchQueryParams {
    pub search: Option<String>,
    pub cursor: Option<String>,
    pub limit: Option<u32>,
    pub is_linked: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct NameCursor {
    pub name: Option<String>,
}

pub struct Names;

impl Names {
    pub async fn get_by_name(
        Path(name): Path<String>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<PackageByNameResponse>, ApiError> {
        let mut versioned = VersionedName::from_str(&name)?;

        let Some(address_data) = app_state
            .loader()
            .load_one(ResolutionKey(versioned.clone()))
            .await?
        else {
            return Err(ApiError::NotFound(format!("Package {} not found", name)));
        };

        // When querying, we want to force the version to the actual version of the package,
        // so our query can fetch the `GitInfo` for the correct version.
        versioned.version = Some(address_data.version as u64);

        let response = app_state
            .loader()
            .load_one(PackageByNameKey(versioned))
            .await?;

        if let Some(response) = response {
            Ok(Json(PackageByNameResponse {
                package_by_name_data: response,
                version: address_data.version,
                package_address: address_data.id,
            }))
        } else {
            Err(ApiError::NotFound(format!("Package {} not found", name)))
        }
    }

    pub async fn search_names(
        Query(params): Query<NameSearchQueryParams>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<PaginatedResponse<NameSearchResponse>>, ApiError> {
        let search = params.search.unwrap_or_default();
        let limit = PaginationLimit::new(params.limit)?;
        let cursor = Cursor::decode_or_default::<NameCursor>(&params.cursor)?;

        let mut connection = app_state.reader().connect().await?;

        let query = diesel::sql_query(
            format!("SELECT name, metadata, mainnet_id as mainnet_package_info_id, testnet_id as testnet_package_info_id, (CASE WHEN name SIMILAR TO $1 OR to_tsvector('english', metadata->>'description') @@ plainto_tsquery($2) THEN 1 ELSE 0 END) AS relevance 
FROM name_records WHERE ( name SIMILAR TO $1 OR to_tsvector('english', metadata->>'description') @@ plainto_tsquery($2) ) AND name > $3 {} 
ORDER BY relevance DESC, name ASC LIMIT $4", if params.is_linked.unwrap_or(false) { "AND (mainnet_id IS NOT NULL OR testnet_id IS NOT NULL) " } else { "" })
        )
        .bind::<VarChar, _>(format!("%{}%", search))
        .bind::<VarChar, _>(search)
        .bind::<VarChar, _>(cursor.name.unwrap_or_default())
        .bind::<Integer, _>(limit.query_limit() as i32);

        let results: Vec<NameSearchResponse> = connection.results(query).await?;

        Ok(Json(format_paginated_response(
            results,
            limit.get(),
            |item| NameCursor {
                name: Some(item.name.clone()),
            },
        )))
    }
}
