use std::collections::HashMap;

use async_graphql::dataloader::Loader;
use chrono::NaiveDate;
use diesel::{
    prelude::Queryable,
    query_dsl::methods::{FilterDsl, OrderDsl, SelectDsl},
    ExpressionMethods,
};
use serde::{Deserialize, Serialize};
use sui_sdk_types::Address;

use crate::errors::ApiError;

use super::reader::Reader;

/// The `NaiveDate` is the date of the analytics query, as we are caching the query on a daily basis
/// per instance.
#[derive(Clone, Eq, PartialEq, Hash, Debug)]
pub struct PackageAnalyticsKey(pub Address, pub NaiveDate);

#[derive(Serialize, Deserialize, Clone, Queryable)]
pub struct PackageAnalytics {
    #[diesel(sql_type = diesel::sql_types::VarChar)]
    pub package_id: String,
    #[diesel(sql_type = diesel::sql_types::Date)]
    pub call_date: NaiveDate,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub direct_calls: i64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub propagated_calls: i64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub total_calls: i64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub aggregated_direct_calls: i64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub aggregated_propagated_calls: i64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub aggregated_total_calls: i64,
}

#[async_trait::async_trait]
impl Loader<PackageAnalyticsKey> for Reader {
    type Value = Vec<PackageAnalytics>;
    type Error = ApiError;

    async fn load(
        &self,
        keys: &[PackageAnalyticsKey],
    ) -> Result<HashMap<PackageAnalyticsKey, Self::Value>, Self::Error> {
        use mvr_schema::schema::package_analytics::dsl as package_analytics;

        if keys.is_empty() {
            return Ok(HashMap::new());
        }

        let mut connection = self.connect().await?;

        // All our analytics for a single package are served for 90days.
        // If we plan to allow more intervals in the future, we'll need to
        // bucket the requests per accepted interval (e.g. 30d, 1d, etc).
        let result: Vec<PackageAnalytics> = connection
            .results(
                package_analytics::package_analytics
                    .select((
                        package_analytics::package_id,
                        package_analytics::call_date,
                        package_analytics::direct_calls,
                        package_analytics::propagated_calls,
                        package_analytics::total_calls,
                        package_analytics::aggregated_direct_calls,
                        package_analytics::aggregated_propagated_calls,
                        package_analytics::aggregated_total_calls,
                    ))
                    .filter(
                        package_analytics::package_id
                            .eq_any(keys.iter().map(|k| k.0.to_string()).collect::<Vec<_>>()),
                    )
                    .filter(package_analytics::call_date.ge(diesel::dsl::sql::<
                        diesel::sql_types::Date,
                    >(
                        "CURRENT_DATE - INTERVAL '91 days'"
                    )))
                    .filter(package_analytics::call_date.le(diesel::dsl::sql::<
                        diesel::sql_types::Date,
                    >(
                        "CURRENT_DATE - INTERVAL '1 day'"
                    )))
                    .order(package_analytics::call_date.desc()),
            )
            .await?;

        let mut response: HashMap<_, Vec<PackageAnalytics>> = HashMap::new();

        for key in keys {
            let analytics = result
                .iter()
                .filter(|r| r.package_id == key.0.to_string())
                .cloned()
                .collect::<Vec<_>>();

            response.insert(key.clone(), analytics);
        }

        Ok(response)
    }
}
