use std::{collections::HashMap, hash::Hash, str::FromStr};

use async_graphql::dataloader::Loader;
use diesel::{
    prelude::QueryableByName,
    sql_types::{Array, Text},
};
use mvr_types::name::VersionedName;
use sui_sdk_types::ObjectId;

use crate::errors::ApiError;

use super::network_field;
use super::reader::Reader;

#[derive(QueryableByName, Debug)]
pub struct ReverseNameResolution {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub name: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub package_id: String,
}

#[derive(Clone, Eq, PartialEq, Hash, Debug)]
pub struct ReverseResolutionKey(pub ObjectId);

#[async_trait::async_trait]
impl Loader<ReverseResolutionKey> for Reader {
    type Value = VersionedName;
    type Error = ApiError;

    async fn load(
        &self,
        keys: &[ReverseResolutionKey],
    ) -> Result<HashMap<ReverseResolutionKey, Self::Value>, Self::Error> {
        if keys.is_empty() {
            return Ok(HashMap::new());
        }

        let mut connection = self.connect().await?;

        let result: Vec<ReverseNameResolution> = connection
            .results(
                diesel::sql_query(format!(
                    "WITH pkg AS (
                    SELECT package_id, original_id
                    FROM packages
                    WHERE package_id = ANY($1)
                )
                SELECT name_records.name, pkg.package_id AS package_id
                FROM package_infos
                INNER JOIN name_records 
                    ON package_infos.id = name_records.{}
                INNER JOIN packages
                    ON package_infos.package_id = packages.package_id
                INNER JOIN pkg 
                    ON (packages.original_id = pkg.original_id OR packages.package_id = pkg.package_id)
                WHERE package_infos.default_name = name_records.name;",
                    network_field(self.network())?
                ))
                .bind::<Array<Text>, _>(
                    keys.iter()
                        .map(|id| id.0.to_string())
                        .collect::<Vec<_>>(),
                ),
            )
            .await?;

        result
            .into_iter()
            .map(|name| {
                // SAFETY: We should never have a malformed name in the database.
                let versioned_name = VersionedName::from_str(&name.name)?;
                // SAFETY: We should never have a malformed package id in the database.
                let object_id = ObjectId::from_str(&name.package_id).map_err(|e| {
                    ApiError::BadRequest(format!(
                        "Failed to parse package id: {e} {}",
                        name.package_id
                    ))
                })?;

                Ok((ReverseResolutionKey(object_id), versioned_name))
            })
            .collect()
    }
}
