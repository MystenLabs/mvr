use std::{str::FromStr, sync::Arc};

use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::Local;
use diesel::{
    prelude::QueryableByName,
    sql_types::{Integer, Nullable, VarChar},
};
use futures::try_join;
use mvr_types::{
    name::VersionedName,
    name_service::{Domain, DomainFormat},
};
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
    utils::pagination::{format_paginated_response, Cursor, PaginatedResponse, PaginationLimit},
};

use super::validate_search_query;

#[derive(Serialize, Deserialize)]
pub struct PackageByNameResponse {
    #[serde(flatten)]
    pub package_by_name_data: PackageByNameBaseData,
    pub version: i64,
    pub package_address: Address,
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
    /// Restrict the results to the names of a single organization (exact match).
    /// Accepts both `@org` (or `sub@org`) and `org.sui` (or `sub.org.sui`) formats.
    pub org: Option<String>,
    pub cursor: Option<String>,
    pub limit: Option<u32>,
    pub is_linked: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct NameCursor {
    pub name: Option<String>,
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

        let limit = PaginationLimit::new(params.limit)?;
        let cursor = Cursor::decode_or_default::<NameCursor>(&params.cursor)?;

        let org_prefix = params
            .org
            .as_deref()
            .map(org_name_prefix_pattern)
            .transpose()?;

        let mut connection = app_state.reader().connect().await?;

        let linked_filter = if params.is_linked.unwrap_or(false) {
            "AND (mainnet_id IS NOT NULL OR testnet_id IS NOT NULL) "
        } else {
            ""
        };

        // `$5` is NULL when there is no org filter. When present, it is an (escaped)
        // `{org}/%` LIKE pattern, which is an exact match on the org part of the name.
        // We intentionally do not use a `name >= '{org}/' AND name < '{org}0'` range,
        // as that is only correct under a byte-order ("C") collation.
        let query = diesel::sql_query(
            format!("SELECT name, metadata, mainnet_id as mainnet_package_info_id, testnet_id as testnet_package_info_id, (CASE WHEN name SIMILAR TO $1 OR to_tsvector('english', metadata->>'description') @@ plainto_tsquery($2) THEN 1 ELSE 0 END) AS relevance 
FROM name_records WHERE ( name SIMILAR TO $1 OR to_tsvector('english', metadata->>'description') @@ plainto_tsquery($2) ) AND name > $3 AND ($5 IS NULL OR name LIKE $5 ESCAPE '\\') {} 
ORDER BY relevance DESC, name ASC LIMIT $4", linked_filter)
        )
        .bind::<VarChar, _>(format!("%{}%", search))
        .bind::<VarChar, _>(search)
        .bind::<VarChar, _>(cursor.name.unwrap_or_default())
        .bind::<Integer, _>(limit.query_limit() as i32)
        .bind::<Nullable<VarChar>, _>(org_prefix);

        let results: Vec<NameSearchResponse> = connection.results(query).await?;

        Ok(Json(format_paginated_response(
            results,
            limit.get(),
            None,
            |item| NameCursor {
                name: Some(item.name.clone()),
            },
        )))
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

/// Parses an org (`@org`, `sub@org`, `org.sui` or `sub.org.sui`), and returns a `LIKE`
/// pattern (using `\` as the escape character) that matches exactly the names of that org,
/// e.g. `@org/%`.
///
/// Names are stored as `{org}/{app}` (with the org in the `@` format), so matching on the
/// `{org}/` prefix is an exact match on the org: `@deep/` is not a prefix of `@deepbook/core`,
/// and `@org/` is not a prefix of `sub@org/app`.
fn org_name_prefix_pattern(org: &str) -> Result<String, ApiError> {
    let invalid = || ApiError::BadRequest(format!("Invalid org: {}", org));

    let domain = Domain::from_str(org).map_err(|_| invalid())?;

    // Names in the registry are always under the `.sui` TLD (`@org` is `org.sui`).
    if domain.labels.first().map(String::as_str) != Some("sui") {
        return Err(invalid());
    }

    let org = domain.format(DomainFormat::At);

    // A valid domain cannot contain any of these characters, but we escape them anyway,
    // so that the pattern is always a literal prefix match.
    let mut pattern = String::with_capacity(org.len() + 2);
    for c in org.chars() {
        if matches!(c, '\\' | '%' | '_') {
            pattern.push('\\');
        }
        pattern.push(c);
    }
    pattern.push_str("/%");

    Ok(pattern)
}

#[cfg(test)]
mod tests {
    use super::org_name_prefix_pattern;

    #[test]
    fn org_prefix_pattern() {
        for (input, expected) in [
            ("@deepbook", "@deepbook/%"),
            ("deepbook.sui", "@deepbook/%"),
            ("sub@org", "sub@org/%"),
            ("sub.org.sui", "sub@org/%"),
            ("a.b@org", "a.b@org/%"),
            ("@my-org", "@my-org/%"),
        ] {
            assert_eq!(org_name_prefix_pattern(input).unwrap(), expected);
        }

        for input in [
            "",
            " ",
            "@",
            "deepbook",
            "deepbook.com",
            "@Deepbook",
            "@deep%",
            "@deep_book",
            "@deep/core",
            "@org/",
            "@org@org",
            "@-org",
            "%",
        ] {
            assert!(org_name_prefix_pattern(input).is_err(), "{input}");
        }
    }
}
