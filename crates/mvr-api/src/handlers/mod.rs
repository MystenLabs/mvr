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
const MAX_SEARCH_QUERY_LENGTH: usize = 255;

pub(crate) mod names;
pub(crate) mod package_address;
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

/// Given a search query, validate that it only contains alphanumeric, spaces,
/// and special characters that are valid in a domain name.
///
/// Also, validate that the query is not too long (we accept max of 255 characters, being the max domain name length).
fn validate_search_query(query: &str) -> Result<(), ApiError> {
    if query.len() > MAX_SEARCH_QUERY_LENGTH {
        return Err(ApiError::BadRequest(format!(
            "Search query is too long: {}",
            query
        )));
    }
    //  only accept alphanumeric, spaces, and special characters that are valid in a domain name.
    if !query.chars().all(|c| {
        c.is_alphanumeric()
            || c.is_whitespace()
            || c == '-'
            || c == '_'
            || c == '@'
            || c == '.'
            || c == '/'
    }) {
        return Err(ApiError::BadRequest(format!(
            "Invalid search query: {}",
            query
        )));
    }

    Ok(())
}
