// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::sync::Arc;

use crate::metrics::RpcMetrics;
use async_graphql::dataloader::DataLoader;
use diesel::dsl::Limit;
use diesel::pg::Pg;
use diesel::query_builder::QueryFragment;
use diesel::result::Error as DieselError;
use diesel_async::methods::LoadQuery;
use diesel_async::RunQueryDsl;
use prometheus::Registry;
use sui_indexer_alt_metrics::db::DbConnectionStatsCollector;
// use prometheus::Registry;
use sui_pg_db as db;
use tracing::debug;
use url::Url;

/// This wrapper type exists to perform error conversion between the data fetching layer and the
/// RPC layer, metrics collection, and debug logging of database queries.
#[derive(Clone)]
pub(crate) struct Reader {
    db: db::Db,
    network: String,
    metrics: Arc<RpcMetrics>,
}

pub(crate) struct Connection<'p> {
    conn: db::Connection<'p>,
    metrics: Arc<RpcMetrics>,
}

#[derive(thiserror::Error, Debug)]
pub(crate) enum ReadError {
    #[error(transparent)]
    Create(anyhow::Error),

    #[error(transparent)]
    Connect(anyhow::Error),

    #[error(transparent)]
    RunQuery(#[from] DieselError),
}

impl Reader {
    pub(crate) async fn new(
        database_url: Url,
        db_args: db::DbArgs,
        network: String,
        metrics: Arc<RpcMetrics>,
        registry: &Registry,
    ) -> Result<Self, ReadError> {
        let db = db::Db::for_read(database_url, db_args)
            .await
            .map_err(ReadError::Create)?;

        registry
            .register(Box::new(DbConnectionStatsCollector::new(
                Some("mvr_api_db"),
                db.clone(),
            )))
            .map_err(|e| ReadError::Create(e.into()))?;

        Ok(Self {
            db,
            network,
            metrics,
        })
    }

    /// Create a data loader backed by this reader.
    pub(crate) fn as_data_loader(&self) -> DataLoader<Self> {
        DataLoader::new(self.clone(), tokio::spawn)
    }

    pub(crate) async fn connect(&self) -> Result<Connection<'_>, ReadError> {
        Ok(Connection {
            conn: self.db.connect().await.map_err(ReadError::Connect)?,
            metrics: self.metrics.clone(),
        })
    }

    pub(crate) fn network(&self) -> &str {
        &self.network
    }
}

impl Connection<'_> {
    pub(crate) async fn results<Q, U>(&mut self, query: Q) -> Result<Vec<U>, ReadError>
    where
        U: Send,
        Q: RunQueryDsl<db::ManagedConnection> + 'static,
        Q: LoadQuery<'static, db::ManagedConnection, U> + QueryFragment<Pg> + Send,
    {
        debug!("{}", diesel::debug_query(&query));

        let _guard = self.metrics.db_latency.start_timer();
        let res = query.get_results(&mut self.conn).await;

        if res.is_ok() {
            self.metrics.db_requests_succeeded.inc();
        } else {
            self.metrics.db_requests_failed.inc();
        }

        Ok(res?)
    }
}
