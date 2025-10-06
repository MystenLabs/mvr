use std::{collections::HashMap, str::FromStr};

use async_graphql::dataloader::Loader;
use diesel::{ExpressionMethods, QueryDsl};
use mvr_schema::schema::package_dependencies;
use serde::{Deserialize, Serialize};
use sui_sdk_types::Address;

use crate::errors::ApiError;

use super::reader::Reader;

// This is a key to load all dependencies for a package.
// Since there are system limits, we do not paginate this endpoint.
#[derive(Clone, Eq, PartialEq, Hash, Debug)]
pub struct PackageDependenciesKey(pub Address);

#[derive(Serialize, Deserialize, Clone)]
pub struct PackageDependencies {
    pub dependencies: Vec<Address>,
}

impl Default for PackageDependencies {
    fn default() -> Self {
        Self {
            dependencies: Vec::new(),
        }
    }
}

#[async_trait::async_trait]
impl Loader<PackageDependenciesKey> for Reader {
    type Value = PackageDependencies;
    type Error = ApiError;

    async fn load(
        &self,
        keys: &[PackageDependenciesKey],
    ) -> Result<HashMap<PackageDependenciesKey, Self::Value>, Self::Error> {
        if keys.is_empty() {
            return Ok(HashMap::new());
        }

        let mut connection = self.connect().await?;

        let package_ids = keys.iter().map(|k| k.0.to_string()).collect::<Vec<_>>();

        let query = package_dependencies::table
            .select((
                package_dependencies::package_id,
                package_dependencies::dependency_package_id,
            ))
            .filter(package_dependencies::package_id.eq_any(package_ids));

        let result: Vec<(String, String)> = connection.results(query).await?;

        let dependencies = result.iter().fold(
            HashMap::new(),
            |mut acc, (package_id, dependency_package_id)| {
                acc.entry(PackageDependenciesKey(
                    // SAFETY: We know that the package_id is a valid Address
                    Address::from_str(package_id).unwrap(),
                ))
                .or_insert_with(|| PackageDependencies {
                    dependencies: Vec::new(),
                })
                // SAFETY: We know that the dependency_package_id is a valid Address
                .dependencies
                .push(Address::from_str(&dependency_package_id).unwrap());
                acc
            },
        );

        Ok(dependencies)
    }
}
