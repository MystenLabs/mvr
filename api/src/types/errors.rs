// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use serde::{Deserialize, Serialize};

#[derive(thiserror::Error, Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub enum MoveRegistryError {
    // The chain identifier is not available, so we cannot determine where to look for the name.
    #[error("Move Registry: Cannot determine which chain to query due to an internal error.")]
    ChainIdentifierUnavailable,
    // The name was found in the service, but it is not a valid name.
    #[error("Move Registry: The request name {0} is malformed.")]
    InvalidName(String),

    #[error("Move Registry: External API url is not available so resolution is not on this RPC.")]
    ExternalApiUrlUnavailable,

    #[error(
        "Move Registry: Internal Error, failed to query external API due to an internal error: {0}"
    )]
    FailedToQueryExternalApi(String),

    #[error("Move Registry Internal Error: Failed to parse external API's response: {0}")]
    FailedToParseExternalResponse(String),

    #[error("Move Registry: The name {0} was not found.")]
    NameNotFound(String),

    #[error("Move Registry: Invalid version")]
    InvalidVersion,
}

#[derive(thiserror::Error, Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub enum NameServiceError {
    #[error("Name Service: String length: {0} exceeds maximum allowed length: {1}")]
    ExceedsMaxLength(usize, usize),
    #[error("Name Service: String length: {0} outside of valid range: [{1}, {2}]")]
    InvalidLength(usize, usize, usize),
    #[error("Name Service: Hyphens are not allowed as the first or last character")]
    InvalidHyphens,
    #[error("Name Service: Only lowercase letters, numbers, and hyphens are allowed")]
    InvalidUnderscore,
    #[error("Name Service: Domain must contain at least one label")]
    LabelsEmpty,
    #[error("Name Service: Domain must include only one separator")]
    InvalidSeparator,
}
