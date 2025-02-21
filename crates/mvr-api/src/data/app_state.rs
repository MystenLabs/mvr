// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::data::reader::Reader;
use async_graphql::dataloader::DataLoader;
use std::sync::Arc;
use sui_pg_db as db;

use super::reader::ReadError;

#[derive(Clone)]
pub struct AppState {
    reader: Reader,
    loader: Arc<DataLoader<Reader>>,
}

impl AppState {
    pub async fn new(args: db::DbArgs, network: String) -> Result<Self, ReadError> {
        let reader = Reader::new(args, network).await?;
        let loader = Arc::new(reader.as_data_loader());

        Ok(Self { reader, loader })
    }

    pub(crate) fn reader(&self) -> &Reader {
        &self.reader
    }

    pub(crate) fn loader(&self) -> &Arc<DataLoader<Reader>> {
        &self.loader
    }
}
