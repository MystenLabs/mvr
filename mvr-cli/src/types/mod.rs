pub mod app_record;
pub mod package;

use std::fs;
use std::path::PathBuf;
use std::str::FromStr;

use anyhow::anyhow;
use anyhow::Context;
use anyhow::Result;
use serde::Deserialize;
use serde::Serialize;
use sui_client::DynamicFieldOutput;
use sui_types::types::TypeTag;

use crate::VERSIONED_NAME_REG;

#[derive(Serialize, Default, Debug)]
pub struct MoveTomlPublishedID {
    pub addresses_id: Option<String>,
    pub published_at_id: Option<String>,
    pub internal_pkg_name: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub(crate) struct MoveRegistryDependency {
    pub network: String,
    pub packages: Vec<String>,
}

pub(crate) struct VersionedName {
    pub name: String,
    pub version: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Domain {
    pub labels: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Name {
    pub org: Domain,
    pub app: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct Env {
    alias: String,
    rpc: String,
    ws: Option<String>,
    /// Basic HTTP access authentication in the format of username:password, if needed.
    basic_auth: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct SuiConfig {
    active_env: String,
    envs: Vec<Env>,
}

impl TryFrom<&str> for Name {
    type Error = anyhow::Error;

    fn try_from(name: &str) -> Result<Self> {
        let s = name
            .split_once('/')
            .ok_or_else(|| anyhow!("Invalid name format. Expected @/"))?;
        let org = Domain {
            labels: vec!["sui".to_string(), s.0.replace("@", "").to_string()],
        };
        let app = vec![s.1.to_string()];
        Ok(Name { org, app })
    }
}

impl TryFrom<&DynamicFieldOutput> for Name {
    type Error = anyhow::Error;

    fn try_from(df: &DynamicFieldOutput) -> Result<Self> {
        let name_typetag = TypeTag::from_str(
            "0xdc7979da429684890fdff92ff48ec566f4b192c8fb7bcf12ab68e9ed7d4eb5e0::name::Name",
        )?;
        df.deserialize_name(&name_typetag)
    }
}

impl SuiConfig {
    pub(crate) fn read_from_file(path: &PathBuf) -> Result<Self> {
        let content = fs::read_to_string(path)?;
        serde_yml::from_str(&content).context("Failed to parse config file")
    }

    pub(crate) fn active_env(&self) -> Result<&Env> {
        self.envs
            .iter()
            .find(|e| e.alias == self.active_env)
            .ok_or_else(|| anyhow!("Cannot find active environment in config"))
    }
}

impl Env {
    pub(crate) fn rpc(&self) -> &str {
        &self.rpc
    }
}

impl FromStr for VersionedName {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let caps = VERSIONED_NAME_REG
            .captures(s)
            .ok_or_else(|| anyhow!("Invalid name format: {}", s))?;

        let org_name = caps
            .get(1)
            .map(|x| x.as_str())
            .ok_or_else(|| anyhow!("Invalid organization name in: {}", s))?;

        let app_name = caps
            .get(2)
            .map(|x| x.as_str())
            .ok_or_else(|| anyhow!("Invalid application name in: {}", s))?;

        let version = caps
            .get(3)
            .map(|x| x.as_str().parse::<u64>())
            .transpose()
            .map_err(|_| anyhow!("Invalid version number. Version must be 1 or greater."))?;

        Ok(Self {
            name: format!("{}/{}", org_name, app_name),
            version,
        })
    }
}
