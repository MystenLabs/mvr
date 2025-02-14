use crate::schema::{git_infos, name_records, package_infos, packages};
use diesel::{Insertable, Queryable};
use serde::{Deserialize, Serialize};

#[derive(Queryable, Insertable, Serialize, Deserialize, Debug)]
#[diesel(table_name = packages)]
pub struct Package {
    pub package_id: String,
    pub original_id: String,
    pub package_version: i64,
    pub move_package: Vec<u8>, // bytea is typically represented as Vec<u8>
}

#[derive(Queryable, Insertable, Serialize, Deserialize, Debug)]
#[diesel(table_name = name_records)]
pub struct NameRecord {
    pub name: String,
    pub mainnet_id: Option<String>,
    pub testnet_id: Option<String>,
    pub metadata: serde_json::Value,
}

#[derive(Queryable, Insertable, Serialize, Deserialize, Debug)]
#[diesel(table_name = package_infos)]
pub struct PackageInfo {
    pub id: String,
    pub package_id: String,
    pub git_table_id: String,
    pub default_name: Option<String>,
    pub metadata: serde_json::Value,
}

#[derive(Queryable, Insertable, Serialize, Deserialize, Debug)]
#[diesel(table_name = git_infos)]
pub struct GitInfo {
    pub table_id: String,
    pub version: i32,
    pub repository: Option<String>,
    pub path: Option<String>,
    pub tag: Option<String>,
}
