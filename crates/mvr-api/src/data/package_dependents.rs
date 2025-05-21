use std::collections::HashMap;

use async_graphql::dataloader::Loader;
use chrono::NaiveDate;
use diesel::{
    dsl::count_star,
    prelude::QueryableByName,
    query_dsl::methods::{FilterDsl, SelectDsl},
    sql_types::{BigInt, Integer, Text},
    ExpressionMethods,
};
use futures::future::try_join_all;
use mvr_schema::schema;
use serde::{Deserialize, Serialize};
use sui_sdk_types::ObjectId;

use crate::{errors::ApiError, utils::pagination::PaginationLimit};

use super::reader::Reader;

#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct PackageDependentsCursor {
    pub package_id: Option<ObjectId>,
    pub aggregated_total_calls: Option<i64>,
}

#[derive(Clone, Eq, PartialEq, Hash, Debug)]
pub struct PackageDependentsKey(
    pub ObjectId,
    pub PackageDependentsCursor,
    pub PaginationLimit,
    pub NaiveDate,
);

#[derive(Clone, Eq, PartialEq, Hash, Debug)]
pub struct PackageDependentsCountKey(pub ObjectId, pub NaiveDate);

#[derive(Serialize, Deserialize, Clone, QueryableByName)]
pub struct PackageDependent {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub package_id: String,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub aggregated_total_calls: i64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub aggregated_direct_calls: i64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub aggregated_propagated_calls: i64,
}

#[async_trait::async_trait]
impl Loader<PackageDependentsKey> for Reader {
    type Value = Vec<PackageDependent>;
    type Error = ApiError;

    async fn load(
        &self,
        keys: &[PackageDependentsKey],
    ) -> Result<HashMap<PackageDependentsKey, Self::Value>, Self::Error> {
        let requests = keys
            .iter()
            .map(|key| get_package_dependents(self, key.clone()));

        // In this particular scenario, we use `try_join_all` to parallelize our db queries,
        // because there is no easy way to parallelize the db queries in the SQL layer,
        // because of our cursor-based pagination.
        Ok(try_join_all(requests).await?.into_iter().collect())
    }
}

#[async_trait::async_trait]
impl Loader<PackageDependentsCountKey> for Reader {
    type Value = i64;
    type Error = ApiError;

    async fn load(
        &self,
        keys: &[PackageDependentsCountKey],
    ) -> Result<HashMap<PackageDependentsCountKey, Self::Value>, Self::Error> {
        let requests = keys
            .iter()
            .map(|key| get_package_dependents_count(self, key.clone()));

        Ok(try_join_all(requests).await?.into_iter().collect())
    }
}

async fn get_package_dependents(
    reader: &Reader,
    key: PackageDependentsKey,
) -> Result<(PackageDependentsKey, Vec<PackageDependent>), ApiError> {
    let package_id = &key.0;

    let mut connection = reader.connect().await?;

    let sql_query = diesel::sql_query(DEPENDENTS_QUERY)
        .bind::<Text, _>(package_id.to_string())
        .bind::<Text, _>(
            key.1
                .package_id
                .map(|id| id.to_string())
                .unwrap_or_default(),
        )
        .bind::<BigInt, _>(key.1.aggregated_total_calls.unwrap_or(i64::MAX))
        .bind::<Integer, _>(key.2.query_limit() as i32);

    let result: Vec<PackageDependent> = connection.results(sql_query).await?;

    Ok((key, result))
}

/// Count the amount of dependents a package has, to be returned together
/// with the page.
async fn get_package_dependents_count(
    reader: &Reader,
    key: PackageDependentsCountKey,
) -> Result<(PackageDependentsCountKey, i64), ApiError> {
    use schema::package_dependencies::dsl as pkg;

    let id = key.0.to_string();

    let count = reader
        .connect()
        .await?
        .first(
            pkg::package_dependencies
                .select(count_star())
                .filter(pkg::dependency_package_id.eq(&id)),
        )
        .await?;

    Ok((key, count))
}

const DEPENDENTS_QUERY: &str = "WITH dependents AS (
    SELECT pd.package_id 
    FROM package_dependencies pd 
    WHERE pd.dependency_package_id = $1), 
latest_activity AS (
    SELECT DISTINCT ON (pa.package_id)
        pa.package_id, 
        pa.aggregated_total_calls, 
        pa.aggregated_direct_calls, 
        pa.aggregated_propagated_calls
    FROM package_analytics pa
    JOIN dependents d ON pa.package_id = d.package_id
    ORDER BY pa.package_id, pa.call_date DESC)
SELECT 
    d.package_id as package_id,
    COALESCE(la.aggregated_direct_calls, 0) AS aggregated_direct_calls,
    COALESCE(la.aggregated_propagated_calls, 0) AS aggregated_propagated_calls,
	COALESCE(la.aggregated_total_calls, 0) AS aggregated_total_calls
FROM dependents d
LEFT JOIN latest_activity la ON d.package_id = la.package_id
WHERE (COALESCE(la.aggregated_total_calls, 0) < $3)
   OR (COALESCE(la.aggregated_total_calls, 0) = $3 AND d.package_id > $2)
ORDER BY aggregated_total_calls DESC, d.package_id ASC
LIMIT $4";
