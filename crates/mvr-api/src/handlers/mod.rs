// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::{collections::HashMap, sync::Arc};

use axum::{extract::State, http::StatusCode};
use sui_sdk_types::ObjectId;

use crate::{
    data::{app_state::AppState, resolution_loader::ResolutionData},
    errors::ApiError,
};

const BATCH_SIZE_DEFAULT: usize = 50;

pub(crate) mod names;
pub(crate) mod resolution;
pub(crate) mod reverse_resolution;
pub(crate) mod struct_definition;
pub(crate) mod type_resolution;

pub(crate) async fn health_check(
    State(app_state): State<Arc<AppState>>,
) -> Result<StatusCode, ApiError> {
    app_state.reader().connect().await.map_err(|_| {
        ApiError::InternalServerError("Failed to get database connection".to_string())
    })?;

    Ok(StatusCode::OK)
}

fn into_object_id_map(resolution: &HashMap<String, ResolutionData>) -> HashMap<String, ObjectId> {
    resolution
        .iter()
        .map(|(k, v)| (k.clone(), v.id))
        .collect::<HashMap<_, _>>()
}

fn validate_batch_size<T>(items: &[T], limit: Option<usize>) -> Result<(), ApiError> {
    let limit = limit.unwrap_or(BATCH_SIZE_DEFAULT);

    if items.len() > limit {
        Err(ApiError::BatchSizeLimitExceeded(items.len(), limit))
    } else {
        Ok(())
    }
}
