use std::{collections::HashMap, sync::Arc};

use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sui_types::base_types::ObjectID;

use crate::{data::reverse_resolution_loader::ReverseResolutionKey, errors::ApiError, AppState};

#[derive(Serialize, Deserialize, Debug)]
pub struct BulkRequest {
    package_ids: Vec<ObjectID>,
}
#[derive(Serialize, Deserialize)]
pub struct BulkResponse {
    resolution: HashMap<ObjectID, String>,
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
        Path(package_id): Path<ObjectID>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<Response>, ApiError> {
        let name = app_state
            .loader()
            .load_one(ReverseResolutionKey(package_id))
            .await?;

        Ok(Json(Response {
            name: name.map(|name| name.to_string()),
        }))
    }

    pub async fn bulk_resolve(
        State(app_state): State<Arc<AppState>>,
        Json(payload): Json<BulkRequest>,
    ) -> Result<Json<BulkResponse>, ApiError> {
        let keys: Vec<_> = payload
            .package_ids
            .iter()
            .map(|id| ReverseResolutionKey(*id))
            .collect();

        let results = app_state.loader().load_many(keys).await?;

        Ok(Json(BulkResponse {
            resolution: results
                .into_iter()
                .map(|(key, name)| (key.0, name.to_string()))
                .collect(),
        }))
    }
}
