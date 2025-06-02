use super::reader::ReadError;
use crate::data::package_resolver::ApiPackageStore;
use crate::data::package_resolver::PackageResolver;
use crate::data::reader::Reader;
use crate::metrics::RpcMetrics;
use async_graphql::dataloader::DataLoader;
use async_graphql::dataloader::LruCache;
use chrono::DateTime;
use chrono::Utc;
use prometheus::Registry;
use std::sync::Arc;
use std::time::Duration;
use sui_package_resolver::{PackageStoreWithLruCache, Resolver};
use sui_pg_db as db;
use tokio::sync::RwLock;
use url::Url;

/// A sitemap that we refresh once every hour per API instance.
/// We keep it in-memory given the size is quite small initially.
///
/// We do not care about multi-instance data staleness given the
/// frequency of re-generation is quite rapid (~1 hr).
pub struct CachedSitemap {
    pub xml: String,
    pub last_updated: Option<DateTime<Utc>>,
}

#[derive(Clone)]
pub struct AppState {
    reader: Reader,
    loader: Arc<DataLoader<Reader>>,
    cached_loader: Arc<DataLoader<Reader, LruCache>>,
    package_resolver: PackageResolver,
    metrics: Arc<RpcMetrics>,
    sitemap_cache: Arc<RwLock<CachedSitemap>>,
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

        // We populate the sitemap on demand, on the first request!
        let sitemap_cache = Arc::new(RwLock::new(CachedSitemap {
            xml: "".to_string(),
            last_updated: None,
        }));

        Ok(Self {
            reader,
            loader,
            cached_loader,
            package_resolver,
            metrics,
            sitemap_cache,
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

    pub(crate) fn sitemap_cache(&self) -> &Arc<RwLock<CachedSitemap>> {
        &self.sitemap_cache
    }
}
