use std::{
    collections::{BTreeSet, HashMap},
    sync::Arc,
};

use super::reader::Reader;
use async_graphql::dataloader::{DataLoader, Loader};
use diesel::{ExpressionMethods, QueryDsl};
use move_core_types::account_address::AccountAddress;
use sui_package_resolver::{
    error::Error, Package, PackageStore, PackageStoreWithLruCache, Resolver, Result,
};
use sui_types::move_package::MovePackage;

pub(crate) type PackageCache = PackageStoreWithLruCache<ApiPackageStore>;
pub(crate) type PackageResolver = Arc<Resolver<PackageCache>>;

const STORE: &str = "PostgreSQL";

pub struct ApiPackageStore(Arc<DataLoader<Reader>>);

#[derive(Copy, Clone, Hash, Eq, PartialEq, Debug)]
struct PackageKey(AccountAddress);

impl ApiPackageStore {
    pub fn new(loader: Arc<DataLoader<Reader>>) -> Self {
        Self(loader)
    }
}

#[async_trait::async_trait]
impl PackageStore for ApiPackageStore {
    async fn fetch(&self, id: AccountAddress) -> Result<Arc<Package>> {
        let Self(loader) = self;
        let Some(package) = loader.load_one(PackageKey(id)).await? else {
            return Err(Error::PackageNotFound(id));
        };

        Ok(package)
    }
}

#[async_trait::async_trait]
impl Loader<PackageKey> for Reader {
    type Value = Arc<Package>;
    type Error = Error;

    async fn load(&self, keys: &[PackageKey]) -> Result<HashMap<PackageKey, Self::Value>> {
        use mvr_schema::schema::packages::dsl as pkg;

        let mut id_to_package = HashMap::new();

        if keys.is_empty() {
            return Ok(id_to_package);
        }

        let mut conn = self.connect().await.map_err(|e| Error::Store {
            store: STORE,
            error: e.to_string(),
        })?;

        let ids: BTreeSet<_> = keys
            .iter()
            .map(|PackageKey(id)| id.to_canonical_string(true))
            .collect();

        let stored_packages: Vec<Vec<u8>> = conn
            .results(
                pkg::packages
                    .select(pkg::move_package)
                    .filter(pkg::package_id.eq_any(ids)),
            )
            .await
            .map_err(|e| Error::Store {
                store: STORE,
                error: e.to_string(),
            })?;

        for stored_package in stored_packages {
            let move_package: MovePackage = bcs::from_bytes(&stored_package)?;
            let package = Package::read_from_package(&move_package)?;
            id_to_package.insert(PackageKey(*move_package.id()), Arc::new(package));
        }

        Ok(id_to_package)
    }
}
