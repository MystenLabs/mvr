use std::{str::FromStr, sync::Arc};

use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::Local;
use futures::try_join;
use serde::{Deserialize, Serialize};
use sui_sdk_types::ObjectId;

use crate::{
    data::{
        app_state::AppState,
        package_dependencies::{PackageDependencies, PackageDependenciesKey},
        package_dependents::{
            PackageDependent, PackageDependentsCountKey, PackageDependentsCursor,
            PackageDependentsKey,
        },
    },
    errors::ApiError,
    utils::pagination::{format_paginated_response, Cursor, PaginatedResponse, PaginationLimit},
};

#[derive(Serialize, Deserialize, Debug)]
pub struct DependentsQueryParams {
    pub cursor: Option<String>,
    pub limit: Option<u32>,
}

pub struct PackageAddress;

impl PackageAddress {
    /// Returns a list of all dependencies for a package address.
    pub async fn dependencies(
        Path(package_address): Path<String>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<PackageDependencies>, ApiError> {
        let object_id = ObjectId::from_str(&package_address)
            .map_err(|e| ApiError::BadRequest(format!("Invalid package address: {}", e)))?;

        let dependencies = app_state
            .cached_loader()
            .load_one(PackageDependenciesKey(object_id))
            .await?;

        Ok(Json(dependencies.unwrap_or_default()))
    }

    /// Returns a list of all dependents for a package address, ordered by the number of total calls to that package.
    /// We are caching the stats on a daily basis, and we do not really care about minor changes within a single day,
    /// on the stats. The only reason we save the Date in the Key, is to re-cache the stats each new day.
    ///
    /// Since our cache is LRU, old entries will eventually be removed, and we will re-fetch the stats from the DB.
    pub async fn dependents(
        Path(package_address): Path<String>,
        Query(params): Query<DependentsQueryParams>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<PaginatedResponse<PackageDependent>>, ApiError> {
        let object_id = ObjectId::from_str(&package_address)
            .map_err(|e| ApiError::BadRequest(format!("Invalid package address: {}", e)))?;

        let limit = PaginationLimit::new(params.limit)?;
        let cursor = Cursor::decode_or_default::<PackageDependentsCursor>(&params.cursor)?;

        let (dependents, dependents_count) = try_join!(
            app_state.cached_loader().load_one(PackageDependentsKey(
                object_id,
                cursor,
                limit.clone(),
                Local::now().date_naive(),
            )),
            app_state
                .cached_loader()
                .load_one(PackageDependentsCountKey(
                    object_id,
                    Local::now().date_naive(),
                )),
        )?;

        Ok(Json(format_paginated_response(
            dependents.unwrap_or_default(),
            limit.get(),
            dependents_count,
            |item| PackageDependentsCursor {
                package_id: Some(ObjectId::from_str(&item.package_id).unwrap()),
                aggregated_total_calls: Some(item.aggregated_total_calls),
            },
        )))
    }
}
