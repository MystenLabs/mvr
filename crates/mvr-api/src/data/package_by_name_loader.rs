// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::collections::HashMap;
use std::str::FromStr;

use async_graphql::dataloader::Loader;
use diesel::{
    prelude::QueryableByName,
    sql_types::{Array, BigInt, Text},
};
use mvr_types::name::VersionedName;
use serde::{Deserialize, Serialize};

use crate::errors::ApiError;

use super::{network_field, reader::Reader};

#[derive(QueryableByName, Debug, Clone)]
pub struct PackageByName {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub name: String,
    #[diesel(sql_type = diesel::sql_types::Jsonb)]
    pub metadata: serde_json::Value,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::VarChar>)]
    pub package_info_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::VarChar>)]
    pub git_table_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::VarChar>)]
    pub default_name: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Jsonb>)]
    pub package_info_metadata: Option<serde_json::Value>,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub version: i64,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub git_info_repository: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub git_info_path: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
    pub git_info_tag: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PackageByNameBaseData {
    pub name: String,
    pub metadata: serde_json::Value,
    pub package_info: Option<PackageInfoResponse>,
    pub git_info: Option<GitInfo>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PackageInfoResponse {
    pub id: String,
    pub git_table_id: String,
    pub default_name: Option<String>,
    pub metadata: serde_json::Value,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GitInfo {
    pub repository_url: String,
    pub path: String,
    pub tag: String,
}

#[derive(Clone, Eq, PartialEq, Hash, Debug)]
pub struct PackageByNameKey(pub VersionedName);

#[async_trait::async_trait]
impl Loader<PackageByNameKey> for Reader {
    type Value = PackageByNameBaseData;
    type Error = ApiError;

    /// This expects the version to be provided, and not being `None`,
    /// otherwise the `GitInfo` will not be fetched.
    async fn load(
        &self,
        keys: &[PackageByNameKey],
    ) -> Result<HashMap<PackageByNameKey, Self::Value>, Self::Error> {
        if keys.is_empty() {
            return Ok(HashMap::new());
        }

        let mut connection = self.connect().await?;

        let sql_query = format!(
            "WITH inp AS (SELECT unnest($1) AS name, unnest($2::bigint[]) AS version) 
            SELECT 
            nr.name,
            nr.metadata,
            pi.id as package_info_id,
            pi.git_table_id as git_table_id,
            pi.default_name as default_name,
            pi.metadata as package_info_metadata,
            i.version as version,
            gi.repository as git_info_repository,
            gi.path as git_info_path,
            gi.tag as git_info_tag
        FROM name_records nr
        INNER JOIN inp i ON nr.name = i.name
        LEFT JOIN package_infos pi ON nr.{} = pi.id
        LEFT JOIN git_infos gi ON pi.git_table_id = gi.table_id AND i.version = gi.version",
            network_field(self.network())?
        );

        let query = diesel::sql_query(sql_query)
            .bind::<Array<Text>, _>(
                keys.iter()
                    .map(|k| k.0.name.to_string())
                    .collect::<Vec<_>>(),
            )
            .bind::<Array<BigInt>, _>(
                keys.iter()
                    .map(|k| k.0.version.unwrap_or(0) as i64)
                    .collect::<Vec<_>>(),
            );

        let result: Vec<PackageByName> = connection.results(query).await?;

        let mut response: HashMap<_, PackageByNameBaseData> = HashMap::new();

        for r in result {
            // reconstruct the versioned name key from the name and version of the query.
            let mut versioned_name = VersionedName::from_str(&r.name)?;
            versioned_name.version = Some(r.version as u64);

            let package_info = r.package_info_id.map(|id| PackageInfoResponse {
                id,
                git_table_id: r.git_table_id.unwrap_or_default(),
                default_name: r.default_name.clone(),
                metadata: r.package_info_metadata.unwrap_or_default(),
            });

            let git_info = r.git_info_repository.map(|repository| GitInfo {
                repository_url: repository,
                path: r.git_info_path.unwrap_or_default(),
                tag: r.git_info_tag.unwrap_or_default(),
            });

            response.insert(
                PackageByNameKey(versioned_name.clone()),
                PackageByNameBaseData {
                    name: r.name,
                    metadata: r.metadata,
                    package_info,
                    git_info,
                },
            );
        }

        Ok(response)
    }
}
