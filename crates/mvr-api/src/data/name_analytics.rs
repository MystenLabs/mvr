use std::{collections::HashMap, str::FromStr};

use async_graphql::dataloader::Loader;
use chrono::NaiveDate;
use diesel::{
    prelude::QueryableByName,
    sql_types::{Array, Text},
};
use mvr_types::name::Name;
use serde::{Deserialize, Serialize};
use sui_sdk_types::ObjectId;

use crate::errors::ApiError;

use super::reader::Reader;

/// The `NameAnalyticsKey` expects a "Name" (MVR name),
/// and an `ObjectId`, which can be ANY version of the package
/// the name resolves to. This can be retrieved from the `package_by_name_loader`.
///
/// The `NaiveDate` is the date of the analytics query, as we are caching the query on a daily basis
/// per instance.
#[derive(Clone, Eq, PartialEq, Hash, Debug)]
pub struct NameAnalyticsKey(pub Name, pub ObjectId, pub NaiveDate);

/// Similar operation with analytics, this returns the "count" of
/// dependents using a package, across versions.
#[derive(Clone, Eq, PartialEq, Hash, Debug)]
pub struct NameDependentsCountKey(pub Name, pub ObjectId, pub NaiveDate);

#[derive(Serialize, Deserialize, Clone, QueryableByName)]
pub struct AnalyticsQueryResponse {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub package_id: String,

    #[diesel(sql_type = diesel::sql_types::Date)]
    pub date_from: NaiveDate,
    #[diesel(sql_type = diesel::sql_types::Date)]
    pub date_to: NaiveDate,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub direct: i64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub propagated: i64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub total: i64,
}

#[derive(Serialize, Deserialize, Clone, QueryableByName)]
pub struct DependenciesCountPerPackageQueryResponse {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub package_id: String,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub count: i64,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct AnalyticsValue {
    pub date_from: NaiveDate,
    pub date_to: NaiveDate,
    pub direct: i64,
    pub propagated: i64,
    pub total: i64,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct AnalyticsAggregatedValues {
    pub analytics: Vec<AnalyticsValue>,
}

#[async_trait::async_trait]
impl Loader<NameAnalyticsKey> for Reader {
    type Value = AnalyticsAggregatedValues;
    type Error = ApiError;

    async fn load(
        &self,
        keys: &[NameAnalyticsKey],
    ) -> Result<HashMap<NameAnalyticsKey, Self::Value>, Self::Error> {
        if keys.is_empty() {
            return Ok(HashMap::new());
        }

        let mut connection = self.connect().await?;

        let package_ids = keys.iter().map(|k| k.1.to_string()).collect::<Vec<_>>();

        let query = diesel::sql_query(ANALYTICS_QUERY).bind::<Array<Text>, _>(package_ids);

        let result: Vec<AnalyticsQueryResponse> = connection.results(query).await?;

        let (addr_name_mapping, mut aggregated_values) = keys.iter().fold(
            (HashMap::new(), HashMap::new()),
            |(mut addr_name_mapping, mut aggregated_values), k| {
                addr_name_mapping.insert(k.1, k.clone());
                aggregated_values
                    .insert(k.clone(), AnalyticsAggregatedValues { analytics: vec![] });
                (addr_name_mapping, aggregated_values)
            },
        );

        for res in result.into_iter() {
            // SAFETY: We should never have a malformed package id in the database.
            let obj_id = ObjectId::from_str(&res.package_id).unwrap();

            if let Some(key) = addr_name_mapping.get(&obj_id) {
                if let Some(v) = aggregated_values.get_mut(key) {
                    v.analytics.push(res.into());
                };
            };
        }

        Ok(aggregated_values)
    }
}

#[async_trait::async_trait]
impl Loader<NameDependentsCountKey> for Reader {
    type Value = i64;
    type Error = ApiError;

    async fn load(
        &self,
        keys: &[NameDependentsCountKey],
    ) -> Result<HashMap<NameDependentsCountKey, Self::Value>, Self::Error> {
        if keys.is_empty() {
            return Ok(HashMap::new());
        }

        let mut connection = self.connect().await?;

        let package_ids: Vec<_> = keys.iter().map(|k| k.1.to_string()).collect();

        let query = diesel::sql_query(DEPENDENTS_COUNT_PER_PACKAGE_QUERY)
            .bind::<Array<Text>, _>(package_ids);

        let result: Vec<DependenciesCountPerPackageQueryResponse> =
            connection.results(query).await?;

        let mut dependents_count = HashMap::new();

        for key in keys.iter() {
            let count = result
                .iter()
                .find(|r| r.package_id == key.1.to_string())
                .map(|r| r.count)
                .unwrap_or(0);
            dependents_count.insert(key.clone(), count);
        }

        Ok(dependents_count)
    }
}

impl From<AnalyticsQueryResponse> for AnalyticsValue {
    fn from(value: AnalyticsQueryResponse) -> Self {
        Self {
            date_from: value.date_from,
            date_to: value.date_to,
            direct: value.direct,
            propagated: value.propagated,
            total: value.total,
        }
    }
}

/// This query is used to bulk-calculate the analytics for a passed packageId. It will calculate
/// the analytics across ALL package versions of that passed packageId.
///
/// We cache the results of the query daily, and our LRU cache will keep the most recent results.
///
/// The query is bulk-optimized, meaning it will calculate the analytics for all versions of the packageId
/// at once, rather than calculating the analytics for each version individually, and is created utilizing all
/// existing indexes on tables.
///
/// The query has `DATE '2023-05-03'` which is the first day of mainnet on Sui.
const ANALYTICS_QUERY: &str = "WITH target AS (
    SELECT package_id, original_id, package_version
    FROM packages
    WHERE package_id = ANY($1)
),
related_packages AS (
    SELECT t.package_id AS input_package_id, p.package_id
    FROM packages p
    JOIN target t ON p.original_id = t.original_id
),
intervals AS (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '1 day',
        DATE '2023-05-03',
        INTERVAL '-14 days'
    )::DATE AS interval_end
),
all_combinations AS (
    SELECT
        rp.input_package_id,
		rp.package_id,
        i.interval_end
    FROM related_packages rp
    CROSS JOIN intervals i
),
aggregated_calls AS (
    SELECT
        ac.input_package_id,
        ac.interval_end,
        SUM(pa.direct_calls)::BIGINT AS direct,
        SUM(pa.propagated_calls)::BIGINT AS propagated,
        SUM(pa.total_calls)::BIGINT AS total
    FROM all_combinations ac
    LEFT JOIN package_analytics pa
      ON pa.package_id = ac.package_id
     AND pa.call_date >= ac.interval_end - INTERVAL '14 days'
     AND pa.call_date < ac.interval_end 
    WHERE pa.call_date IS NULL OR pa.call_date < CURRENT_DATE
    GROUP BY ac.input_package_id, ac.interval_end
)
SELECT
    input_package_id as package_id,
    (interval_end - INTERVAL '13 days')::DATE AS date_from,
    interval_end AS date_to,
    COALESCE(direct, 0) AS direct,
    COALESCE(propagated, 0) AS propagated,
    COALESCE(total, 0) AS total
FROM aggregated_calls
ORDER BY interval_end";

const DEPENDENTS_COUNT_PER_PACKAGE_QUERY: &str = "WITH target AS (
    SELECT package_id, original_id, package_version
    FROM packages
    WHERE package_id = ANY($1)
),
related_packages AS (
    SELECT t.package_id AS input_package_id, p.package_id
    FROM packages p
    JOIN target t ON p.original_id = t.original_id
),
dependencies as (
	SELECT input_package_id, pd.package_id from package_dependencies pd 
	JOIN related_packages rp ON rp.package_id = dependency_package_id
)
SELECT input_package_id as package_id, COUNT(DISTINCT package_id) as count FROM dependencies d
GROUP BY input_package_id";
