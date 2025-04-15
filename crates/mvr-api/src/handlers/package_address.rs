use std::{str::FromStr, sync::Arc};

use axum::{
    extract::{Path, State},
    Json,
};
use sui_sdk_types::ObjectId;

use crate::{
    data::{
        app_state::AppState,
        package_dependencies::{PackageDependencies, PackageDependenciesKey},
    },
    errors::ApiError,
};

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

        let dependencies = dependencies.unwrap_or_default();

        Ok(Json(dependencies))
    }
}
