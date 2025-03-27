// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::collections::HashMap;

use async_graphql::dataloader::Loader;
use diesel::{
    prelude::QueryableByName,
    sql_types::{Array, Text},
};
use mvr_types::name::VersionedName;
use serde::{Deserialize, Serialize};

use crate::errors::ApiError;

use super::reader::Reader;

#[derive(QueryableByName, Debug, Clone)]
pub struct PackageByName {
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub name: String,
    #[diesel(sql_type = diesel::sql_types::Jsonb)]
    pub metadata: serde_json::Value,
    #[diesel(sql_type = diesel::sql_types::Text)]
    pub network_type: String,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::VarChar>)]
    pub package_info_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::VarChar>)]
    pub git_table_id: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::VarChar>)]
    pub default_name: Option<String>,
    #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Jsonb>)]
    pub package_info_metadata: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PackageByNameResponse {
    pub name: String,
    pub metadata: serde_json::Value,
    pub mainnet: Option<PackageInfoResponse>,
    pub testnet: Option<PackageInfoResponse>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PackageInfoResponse {
    pub id: String,
    pub git_table_id: String,
    pub default_name: Option<String>,
    pub metadata: serde_json::Value,
}

#[derive(Clone, Eq, PartialEq, Hash, Debug)]
pub struct PackageByNameKey(pub VersionedName);

#[async_trait::async_trait]
impl Loader<PackageByNameKey> for Reader {
    type Value = PackageByNameResponse;
    type Error = ApiError;

    async fn load(
        &self,
        keys: &[PackageByNameKey],
    ) -> Result<HashMap<PackageByNameKey, Self::Value>, Self::Error> {
        if keys.is_empty() {
            return Ok(HashMap::new());
        }

        let mut connection = self.connect().await?;

        let query = diesel::sql_query(
            "
            SELECT 
                name_records.name,
                name_records.metadata,
                package_infos.id as package_info_id,
                package_infos.git_table_id as git_table_id,
                package_infos.default_name as default_name,
                package_infos.metadata as package_info_metadata,
                CASE 
                    WHEN name_records.mainnet_id = package_infos.id THEN 'mainnet'
                    WHEN name_records.testnet_id = package_infos.id THEN 'testnet'
                    ELSE 'unknown'
                END AS network_type
            FROM 
                name_records
            LEFT JOIN 
                package_infos 
            ON 
                name_records.mainnet_id = package_infos.id
                OR name_records.testnet_id = package_infos.id
            WHERE
                name_records.name = ANY($1)
            ",
        )
        .bind::<Array<Text>, _>(
            keys.iter()
                .map(|k| k.0.name.to_string())
                .collect::<Vec<_>>(),
        );

        let result: Vec<PackageByName> = connection.results(query).await?;

        let mut response: HashMap<_, PackageByNameResponse> = HashMap::new();

        for r_name in keys {
            let name = r_name.0.name.to_string();
            let results: Vec<_> = result.iter().filter(|p| p.name == name).collect();

            // no results found for this name, skip it.
            if results.is_empty() {
                continue;
            }

            let pkg = results[0].clone();

            let mainnet = result
                .iter()
                .find(|p| p.network_type == "mainnet")
                .map(|p| p.clone());
            let testnet = result
                .iter()
                .find(|p| p.network_type == "testnet")
                .map(|p| p.clone());

            response.insert(
                r_name.clone(),
                PackageByNameResponse {
                    name: pkg.name,
                    metadata: pkg.metadata,
                    mainnet: mainnet.map(|p| PackageInfoResponse {
                        id: p.package_info_id.unwrap_or_default(),
                        git_table_id: p.git_table_id.unwrap_or_default(),
                        default_name: p.default_name.clone(),
                        metadata: p.package_info_metadata.unwrap_or_default(),
                    }),
                    testnet: testnet.map(|p| PackageInfoResponse {
                        id: p.package_info_id.unwrap_or_default(),
                        git_table_id: p.git_table_id.unwrap_or_default(),
                        default_name: p.default_name.clone(),
                        metadata: p.package_info_metadata.unwrap_or_default(),
                    }),
                },
            );
        }

        Ok(response)
    }
}
