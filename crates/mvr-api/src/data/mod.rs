// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::errors::ApiError;

pub mod app_state;
pub mod reader;
pub mod resolution_loader;

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
