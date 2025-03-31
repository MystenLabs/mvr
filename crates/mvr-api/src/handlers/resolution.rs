// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::{collections::HashMap, str::FromStr, sync::Arc};

use axum::{
    extract::{Path, State},
    Json,
};
use mvr_types::name::VersionedName;
use serde::{Deserialize, Serialize};

use crate::{data::resolution_loader::ResolutionKey, errors::ApiError, AppState};

#[derive(Serialize, Deserialize)]
pub struct BulkRequest {
    pub names: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct Response {
    package_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct BulkResponse {
    resolution: HashMap<String, Response>,
}

pub struct Resolution;

impl Resolution {
    pub async fn resolve(
        Path(name): Path<String>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<Response>, ApiError> {
        let versioned_name = VersionedName::from_str(&name)?;

        let pkg = app_state
            .loader()
            .load_one(ResolutionKey(versioned_name))
            .await?
            .ok_or(ApiError::BadRequest(format!("Name not found: {name}")))?;

        Ok(Json(Response {
            package_id: Some(pkg.id.to_canonical_string(true)),
        }))
    }

    /// Resolve a list of names at once.
    pub async fn bulk_resolve(
        State(app_state): State<Arc<AppState>>,
        Json(payload): Json<BulkRequest>,
    ) -> Result<Json<BulkResponse>, ApiError> {
        let names = payload
            .names
            .iter()
            .map(|name| VersionedName::from_str(name).map(ResolutionKey))
            .collect::<Result<Vec<_>, _>>()?;

        let resolution = app_state
            .loader()
            .load_many(names)
            .await?
            .into_iter()
            .map(|(name, pkg)| {
                (
                    name.0.to_string(),
                    Response {
                        package_id: Some(pkg.id.to_canonical_string(true)),
                    },
                )
            })
            .collect::<HashMap<String, Response>>();

        Ok(Json(BulkResponse { resolution }))
    }
}
