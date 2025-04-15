// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::errors::ApiError;

pub(crate) mod app_state;
pub(crate) mod package_by_name_loader;
pub(crate) mod package_dependencies;
pub(crate) mod package_resolver;
pub(crate) mod reader;
pub(crate) mod resolution_loader;
pub(crate) mod reverse_resolution_loader;

fn network_field(network: &str) -> Result<&str, ApiError> {
    match network {
        "mainnet" => Ok("mainnet_id"),
        "testnet" => Ok("testnet_id"),
        _ => Err(ApiError::BadRequest(format!(
            "Invalid network: {}",
            network
        ))),
    }
}
