// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use mvr_types::errors::{MoveRegistryError, NameServiceError};
use serde::Serialize;

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use thiserror::Error;

use crate::data::reader::ReadError;

#[derive(Debug, Error, Clone, Hash, Eq, PartialEq)]
pub enum ApiError {
    #[error("Invalid input: {0}")]
    BadRequest(String),

    #[error("Internal server error: {0}")]
    InternalServerError(String),
}

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::InternalServerError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(ErrorResponse { message });
        (status, body).into_response()
    }
}

impl From<MoveRegistryError> for ApiError {
    fn from(error: MoveRegistryError) -> Self {
        ApiError::BadRequest(error.to_string())
    }
}

impl From<NameServiceError> for ApiError {
    fn from(error: NameServiceError) -> Self {
        ApiError::BadRequest(error.to_string())
    }
}

impl From<ReadError> for ApiError {
    fn from(error: ReadError) -> Self {
        match error {
            ReadError::Create(e) => ApiError::InternalServerError(e.to_string()),
            ReadError::Connect(e) => ApiError::InternalServerError(e.to_string()),
            ReadError::RunQuery(e) => ApiError::InternalServerError(e.to_string()),
        }
    }
}
