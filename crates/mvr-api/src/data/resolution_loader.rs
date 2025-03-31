// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::{collections::HashMap, str::FromStr};

use async_graphql::dataloader::Loader;
use diesel::{
    prelude::QueryableByName,
    sql_types::{Array, BigInt, Text},
};
use mvr_types::name::VersionedName;
use sui_sdk_types::ObjectId;

use crate::errors::ApiError;

use super::network_field;
use super::reader::Reader;

#[derive(QueryableByName, Debug)]
pub struct NameResolution {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub package_id: String,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub name: String,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub version: i64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub package_version: i64,
}

#[derive(Clone, Eq, PartialEq, Debug)]
pub struct ResolutionData {
    pub id: ObjectId,
    pub version: i64,
}

#[derive(Clone, Eq, PartialEq, Hash, Debug)]
pub struct ResolutionKey(pub VersionedName);

#[async_trait::async_trait]
impl Loader<ResolutionKey> for Reader {
    type Value = ResolutionData;
    type Error = ApiError;

    async fn load(
        &self,
        keys: &[ResolutionKey],
    ) -> Result<HashMap<ResolutionKey, Self::Value>, Self::Error> {
        if keys.is_empty() {
            return Ok(HashMap::new());
        }

        let (names, versions) = keys
            .iter()
            .map(|name| (name.0.name.to_string(), name.0.version.unwrap_or(0) as i64))
            .unzip::<_, _, Vec<String>, Vec<i64>>();

        let mut connection = self.connect().await?;

        let query = diesel::sql_query(format!(
            "WITH inp AS (SELECT unnest($1) AS name, unnest($2) AS version),
    pkg AS (
        SELECT p.original_id, p.package_id, nr.name, i.version
        FROM packages p
        INNER JOIN package_infos pi ON p.package_id = pi.package_id
        INNER JOIN name_records nr ON pi.id = nr.{}
        INNER JOIN inp i ON nr.name = i.name
    )
    SELECT DISTINCT ON (pkg.name, pkg.version) pkg.name, p.package_id, pkg.version, p.package_version
    FROM pkg
    INNER JOIN packages p ON p.original_id = pkg.original_id
    AND (pkg.version = 0 OR p.package_version = pkg.version)
    ORDER BY pkg.name, pkg.version, p.package_version DESC;",
            network_field(self.network())?
        ))
        .bind::<Array<Text>, _>(names.clone())
        .bind::<Array<BigInt>, _>(versions);

        let result: Vec<NameResolution> = connection.results(query).await?;

        result
            .into_iter()
            .map(|name| {
                let mut versioned_name = VersionedName::from_str(&name.name)?;
                versioned_name.version = (name.version > 0).then_some(name.version as u64);
                let object_id = ObjectId::from_str(&name.package_id).map_err(|e| {
                    ApiError::BadRequest(format!(
                        "Failed to parse package id: {e} {}",
                        name.package_id
                    ))
                })?;

                Ok((
                    ResolutionKey(versioned_name),
                    ResolutionData {
                        id: object_id,
                        version: name.package_version,
                    },
                ))
            })
            .collect()
    }
}
