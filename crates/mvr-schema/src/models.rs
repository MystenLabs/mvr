use crate::schema::{git_infos, name_records, package_dependencies, package_infos, packages};
use anyhow::anyhow;
use chrono::NaiveDateTime;
use diesel::{Insertable, Queryable};
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};
use std::str::FromStr;
use sui_field_count::FieldCount;

#[derive(Queryable, Insertable, Serialize, Deserialize, Debug, FieldCount)]
#[diesel(table_name = packages)]
pub struct Package {
    pub package_id: String,
    pub original_id: String,
    pub package_version: i64,
    pub move_package: Vec<u8>,
    pub chain_id: String,
    pub tx_hash: String,
    pub sender: String,
    pub timestamp: NaiveDateTime,

    #[diesel(skip_insertion)]
    pub deps: Vec<String>,
}

#[derive(Queryable, Insertable, Serialize, Deserialize, Debug, FieldCount)]
#[diesel(table_name = package_dependencies, primary_key(package_id, dependency_package_id))]
pub struct PackageDependency {
    pub package_id: String,
    pub dependency_package_id: String,
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

#[derive(Debug, Copy, Clone)]
pub enum SuiEnv {
    Mainnet,
    Testnet,
}

impl FromStr for SuiEnv {
    type Err = anyhow::Error;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "mainnet" => Ok(Self::Mainnet),
            "testnet" => Ok(Self::Testnet),
            _ => Err(anyhow!("Unsupported sui env {s}.")),
        }
    }
}

impl Display for SuiEnv {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            SuiEnv::Mainnet => write!(f, "mainnet"),
            SuiEnv::Testnet => write!(f, "testnet"),
        }
    }
}
