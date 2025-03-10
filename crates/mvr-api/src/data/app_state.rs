use crate::data::package_resolver::ApiPackageStore;
use crate::data::package_resolver::PackageResolver;
use crate::data::reader::Reader;
use crate::metrics::RpcMetrics;
use async_graphql::dataloader::DataLoader;
use prometheus::Registry;
use std::sync::Arc;
use sui_package_resolver::{PackageStoreWithLruCache, Resolver};
use sui_pg_db as db;

use super::reader::ReadError;

#[derive(Clone)]
pub struct AppState {
    reader: Reader,
    loader: Arc<DataLoader<Reader>>,
    package_resolver: PackageResolver,
    metrics: Arc<RpcMetrics>,
}

impl AppState {
    pub async fn new(
        args: db::DbArgs,
        network: String,
        registry: &Registry,
    ) -> Result<Self, ReadError> {
        let metrics = RpcMetrics::new(registry);
        let reader = Reader::new(args, network, metrics.clone(), registry).await?;

        // Try to open a read connection to verify we can
        // connect to the DB on startup.
        let _ = reader.connect().await?;

        let loader = Arc::new(reader.as_data_loader());
        let api_pkg_resolver = ApiPackageStore::new(loader.clone());
        let package_cache = PackageStoreWithLruCache::new(api_pkg_resolver);
        let package_resolver = Arc::new(Resolver::new(package_cache));

        Ok(Self {
            reader,
            loader,
            package_resolver,
            metrics,
        })
    }

    pub(crate) fn reader(&self) -> &Reader {
        &self.reader
    }

    pub(crate) fn loader(&self) -> &Arc<DataLoader<Reader>> {
        &self.loader
    }

    pub(crate) fn package_resolver(&self) -> &PackageResolver {
        &self.package_resolver
    }

    pub(crate) fn metrics(&self) -> &RpcMetrics {
        &self.metrics
    }

    pub(crate) fn network(&self) -> &str {
        &self.reader.network()
    }
}
