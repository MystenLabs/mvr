use std::{collections::HashMap, sync::Arc};

use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sui_sdk_types::Address as ObjectId;

use crate::{data::reverse_resolution_loader::ReverseResolutionKey, errors::ApiError, AppState};

use super::validate_batch_size;

#[derive(Serialize, Deserialize, Debug)]
pub struct BulkRequest {
    package_ids: Vec<ObjectId>,
}
#[derive(Serialize, Deserialize)]
pub struct BulkResponse {
    resolution: HashMap<ObjectId, Response>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ResolvedName(pub Option<String>);

#[derive(Serialize, Deserialize)]
pub struct Response {
    name: Option<String>,
}

pub struct ReverseResolution;

impl ReverseResolution {
    pub async fn resolve(
        Path(package_id): Path<ObjectId>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<Response>, ApiError> {
        let name = app_state
            .loader()
            .load_one(ReverseResolutionKey(package_id))
            .await?
            .ok_or(ApiError::BadRequest(format!(
                "Name not found for package: {package_id}"
            )))?;

        Ok(Json(Response {
            name: Some(name.to_string()),
        }))
    }

    pub async fn bulk_resolve(
        State(app_state): State<Arc<AppState>>,
        Json(payload): Json<BulkRequest>,
    ) -> Result<Json<BulkResponse>, ApiError> {
        validate_batch_size(&payload.package_ids, None)?;
        let keys: Vec<_> = payload
            .package_ids
            .iter()
            .map(|id| ReverseResolutionKey(*id))
            .collect();

        let results = app_state.loader().load_many(keys).await?;

        Ok(Json(BulkResponse {
            resolution: results
                .into_iter()
                .map(|(key, name)| {
                    (
                        key.0,
                        Response {
                            name: Some(name.to_string()),
                        },
                    )
                })
                .collect(),
        }))
    }
}
