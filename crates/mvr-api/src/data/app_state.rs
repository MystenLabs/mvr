use super::reader::ReadError;
use crate::data::package_resolver::ApiPackageStore;
use crate::data::package_resolver::PackageResolver;
use crate::data::reader::Reader;
use crate::metrics::RpcMetrics;
use async_graphql::dataloader::DataLoader;
use async_graphql::dataloader::LruCache;
use prometheus::Registry;
use std::sync::Arc;
use std::time::Duration;
use sui_package_resolver::{PackageStoreWithLruCache, Resolver};
use sui_pg_db as db;
use url::Url;

#[derive(Clone)]
pub struct AppState {
    reader: Reader,
    loader: Arc<DataLoader<Reader>>,
    cached_loader: Arc<DataLoader<Reader, LruCache>>,
    package_resolver: PackageResolver,
    metrics: Arc<RpcMetrics>,
}

impl AppState {
    pub async fn new(
        database_url: Url,
        args: db::DbArgs,
        network: String,
        registry: &Registry,
    ) -> Result<Self, ReadError> {
        let metrics = RpcMetrics::new(registry);
        let reader = Reader::new(database_url, args, network, metrics.clone(), registry).await?;

        // Try to open a read connection to verify we can
        // connect to the DB on startup.
        let _ = reader.connect().await?;

        let loader = Arc::new(reader.as_data_loader());
        let cached_loader = Arc::new(reader.as_cached_data_loader(Duration::from_millis(50)));
        let api_pkg_resolver = ApiPackageStore::new(loader.clone());
        let package_cache = PackageStoreWithLruCache::new(api_pkg_resolver);
        let package_resolver = Arc::new(Resolver::new(package_cache));

        Ok(Self {
            reader,
            loader,
            cached_loader,
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

    pub(crate) fn cached_loader(&self) -> &Arc<DataLoader<Reader, LruCache>> {
        &self.cached_loader
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
