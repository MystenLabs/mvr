use std::sync::Arc;

use crate::PgPool;
use async_trait::async_trait;
use diesel::{ExpressionMethods, QueryDsl};
use diesel_async::RunQueryDsl;
use move_core_types::account_address::AccountAddress;
use sui_package_resolver::{
    error::Error as PackageResolverError, Package as NativePackage, PackageStore,
    PackageStoreWithLruCache, Resolver, Result,
};
use sui_types::object::Object;

pub(crate) type PackageCache = PackageStoreWithLruCache<ApiPackageStore>;
pub(crate) type PackageResolver = Arc<Resolver<PackageCache>>;

const STORE: &str = "ApiPackageStore";

/// Store which fetches package for the given address from the backend db on every call
/// to `fetch`
pub struct ApiPackageStore(PgPool);

impl ApiPackageStore {
    pub fn new(pool: PgPool) -> Self {
        Self(pool)
    }
}

#[async_trait]
impl PackageStore for ApiPackageStore {
    async fn fetch(&self, id: AccountAddress) -> Result<Arc<NativePackage>> {
        self.fetch_package(id).await
    }
}

impl ApiPackageStore {
    async fn fetch_package(&self, id: AccountAddress) -> Result<Arc<NativePackage>> {
        use crate::schema::packages::dsl::*;
        let mut conn = self
            .0
            .get()
            .await
            .map_err(|_| PackageResolverError::Store {
                store: STORE,
                error: "Failed to get connection to fetch package".to_string(),
            })?;

        let pkg = packages
            .select(move_package)
            .filter(package_id.eq(id.to_canonical_string(true)))
            .get_result::<Vec<u8>>(&mut conn)
            .await
            .map_err(|_| PackageResolverError::PackageNotFound(id))?;

        let object = bcs::from_bytes::<Object>(&pkg).map_err(PackageResolverError::Bcs)?;

        let package = NativePackage::read_from_object(&object)?;

        Ok(Arc::new(package))
    }
}
