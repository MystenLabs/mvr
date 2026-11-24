use std::{str::FromStr, sync::Arc};

use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::Local;
use diesel::{
    prelude::QueryableByName,
    sql_types::{BigInt, Jsonb, Nullable, Text, VarChar},
};
use futures::try_join;
use mvr_types::name::VersionedName;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sui_sdk_types::Address;

use crate::{
    data::{
        app_state::AppState,
        name_analytics::{AnalyticsValue, NameAnalyticsKey, NameDependentsCountKey},
        package_by_name_loader::{PackageByNameBaseData, PackageByNameKey},
        resolution_loader::ResolutionKey,
    },
    errors::ApiError,
    utils::pagination::{format_paginated_response, PaginatedResponse, Pagination},
};

use super::{
    orgs::{org_name_prefix_pattern, parse_org},
    validate_search_query,
};

#[derive(Serialize, Deserialize)]
pub struct PackageByNameResponse {
    #[serde(flatten)]
    pub package_by_name_data: PackageByNameBaseData,
    pub version: i64,
    pub package_address: Address,
}

#[derive(Serialize, Deserialize)]
pub struct NameSearchResponse {
    pub name: String,
    pub metadata: Value,
    pub mainnet_package_info_id: Option<String>,
    pub testnet_package_info_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NameSearchQueryParams {
    pub search: Option<String>,
    /// Restrict the results to the names of a single organization (exact match).
    /// Accepts both `@org` (or `sub@org`) and `org.sui` (or `sub.org.sui`) formats.
    pub org: Option<String>,
    pub cursor: Option<String>,
    pub offset: Option<u32>,
    pub limit: Option<u32>,
    pub is_linked: Option<bool>,
}

#[derive(QueryableByName)]
struct NameSearchRow {
    #[diesel(sql_type = Nullable<Text>)]
    name: Option<String>,
    #[diesel(sql_type = Nullable<Jsonb>)]
    metadata: Option<Value>,
    #[diesel(sql_type = Nullable<Text>)]
    mainnet_package_info_id: Option<String>,
    #[diesel(sql_type = Nullable<Text>)]
    testnet_package_info_id: Option<String>,
    #[diesel(sql_type = BigInt)]
    total: i64,
}

#[derive(Serialize, Deserialize, Default)]
pub struct AnalyticsResponse {
    pub analytics: Vec<AnalyticsValue>,
    pub total_dependents: i64,
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
        validate_search_query(&search)?;

        let pagination = Pagination::new(params.cursor.as_deref(), params.offset, params.limit)?;

        let org_prefix = params
            .org
            .as_deref()
            .map(parse_org)
            .transpose()?
            .map(|org| org_name_prefix_pattern(&org));

        let mut connection = app_state.reader().connect().await?;

        let linked_filter = if params.is_linked.unwrap_or(false) {
            "AND (mainnet_id IS NOT NULL OR testnet_id IS NOT NULL)"
        } else {
            ""
        };

        // `$3` is NULL when there is no org filter. When present, it is an `{org}/%`
        // LIKE pattern (see `org_name_prefix_pattern`), which is an exact match on the
        // org part of the name.
        // We intentionally do not use a `name >= '{org}/' AND name < '{org}0'` range,
        // as that is only correct under a byte-order ("C") collation.
        let query = diesel::sql_query(format!(
            r#"WITH matching AS (
    SELECT name, metadata, mainnet_id, testnet_id
    FROM name_records
    WHERE (name SIMILAR TO $1 OR to_tsvector('english', metadata->>'description') @@ plainto_tsquery($2))
        AND ($3 IS NULL OR name LIKE $3) {linked_filter}
), page AS (
    SELECT * FROM matching
    ORDER BY name ASC
    LIMIT $4 OFFSET $5
)
SELECT
    page.name,
    page.metadata,
    page.mainnet_id AS mainnet_package_info_id,
    page.testnet_id AS testnet_package_info_id,
    totals.total
FROM (SELECT COUNT(*) AS total FROM matching) totals
LEFT JOIN page ON TRUE
ORDER BY page.name ASC"#
        ))
        .bind::<VarChar, _>(format!("%{}%", search))
        .bind::<VarChar, _>(search)
        .bind::<Nullable<VarChar>, _>(org_prefix)
        .bind::<BigInt, _>(pagination.limit().query_limit() as i64)
        .bind::<BigInt, _>(pagination.offset() as i64);

        let rows: Vec<NameSearchRow> = connection.results(query).await?;

        let total = rows.first().map(|row| row.total);

        let results: Vec<NameSearchResponse> = rows
            .into_iter()
            .filter_map(|row| {
                Some(NameSearchResponse {
                    name: row.name?,
                    metadata: row.metadata?,
                    mainnet_package_info_id: row.mainnet_package_info_id,
                    testnet_package_info_id: row.testnet_package_info_id,
                })
            })
            .collect();

        Ok(Json(format_paginated_response(results, &pagination, total)))
    }

    /// Aggregated analytics by package name.
    pub async fn get_analytics(
        Path(name): Path<String>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<AnalyticsResponse>, ApiError> {
        let name = VersionedName::from_str(&name)?;

        let Some(resolution) = app_state
            .loader()
            .load_one(ResolutionKey(name.clone()))
            .await?
        else {
            return Err(ApiError::NotFound(format!("Package {} not found", name)));
        };

        let (analytics, total_dependents) = try_join!(
            app_state.cached_loader().load_one(NameAnalyticsKey(
                name.name.clone(),
                resolution.id,
                Local::now().date_naive(),
            )),
            app_state.cached_loader().load_one(NameDependentsCountKey(
                name.name.clone(),
                resolution.id,
                Local::now().date_naive()
            )),
        )?;

        Ok(Json(AnalyticsResponse {
            analytics: analytics.unwrap_or_default().analytics,
            total_dependents: total_dependents.unwrap_or_default(),
        }))
    }
}
