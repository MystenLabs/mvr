use std::{str::FromStr, sync::Arc};

use axum::{
    extract::{Path, State},
    Json,
};
use mvr_types::name::VersionedName;
use serde::{Deserialize, Serialize};
use sui_sdk_types::ObjectId;

use crate::{
    data::{
        app_state::AppState,
        package_by_name_loader::{PackageByNameBaseData, PackageByNameKey},
        resolution_loader::ResolutionKey,
    },
    errors::ApiError,
};

#[derive(Serialize, Deserialize)]
pub struct PackageByNameResponse {
    #[serde(flatten)]
    pub package_by_name_data: PackageByNameBaseData,
    pub version: i64,
    pub package_address: ObjectId,
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
}
