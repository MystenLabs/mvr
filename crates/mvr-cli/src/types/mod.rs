pub mod app_record;
pub mod package;

use std::fs;
use std::path::PathBuf;

use anyhow::anyhow;
use anyhow::Context;
use anyhow::Result;
use mvr_types::name::Name;
use serde::Deserialize;
use serde::Serialize;
use sui_client::DynamicFieldOutput;

use crate::NAME_TYPETAG;

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

pub(crate) struct LocalName(pub Name);

impl TryFrom<&DynamicFieldOutput> for LocalName {
    type Error = anyhow::Error;

    fn try_from(df: &DynamicFieldOutput) -> Result<Self> {
        let name: Name = df
            .deserialize_name(&NAME_TYPETAG)
            .map_err(|e| anyhow::anyhow!(e))?;
        Ok(LocalName(name))
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
