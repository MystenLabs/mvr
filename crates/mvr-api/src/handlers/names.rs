use std::{str::FromStr, sync::Arc};

use axum::{
    extract::{Path, State},
    Json,
};
use mvr_types::name::VersionedName;

use crate::{
    data::{
        app_state::AppState,
        package_by_name_loader::{PackageByNameKey, PackageByNameResponse},
    },
    errors::ApiError,
};

pub struct Names;

impl Names {
    pub async fn get_by_name(
        Path(name): Path<String>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<PackageByNameResponse>, ApiError> {
        let versioned = VersionedName::from_str(&name)?;

        let response = app_state
            .loader()
            .load_one(PackageByNameKey(versioned))
            .await?;

        if let Some(response) = response {
            Ok(Json(response))
        } else {
            Err(ApiError::NotFound(format!("Package {} not found", name)))
        }
    }
}
