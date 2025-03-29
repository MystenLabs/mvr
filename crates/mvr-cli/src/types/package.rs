use std::collections::HashMap;
use std::fmt;

use anyhow::anyhow;
use anyhow::Result;
use serde::Deserialize;
use serde::Serialize;

use sui_client::DynamicFieldOutput;
use sui_sdk_types::ObjectId;

use crate::PACKAGE_INFO_TYPETAG;

#[derive(Serialize, PartialEq, Debug)]
pub enum PackageInfoNetwork {
    Mainnet,
    Testnet,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PackageInfo {
    pub upgrade_cap_id: ObjectId,
    pub package_address: ObjectId,
    pub git_versioning: HashMap<u64, GitInfo>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GitInfo {
    pub repository: String,
    pub path: String,
    pub tag: String,
}

impl TryFrom<DynamicFieldOutput> for PackageInfo {
    type Error = anyhow::Error;

    fn try_from(df: DynamicFieldOutput) -> Result<Self> {
        df.deserialize_value(&PACKAGE_INFO_TYPETAG)
            .map_err(|e| anyhow::anyhow!(e))
    }
}

impl GitInfo {
    /// Deserialize the GitInfo data from the value of a dynamic field.
    pub fn extract_git_info(df: &DynamicFieldOutput) -> Result<Self> {
        let bcs = df
            .value
            .as_ref()
            .ok_or_else(|| anyhow!("No value found in DynamicFieldOutput"))?;
        let git_info: GitInfo = bcs::from_bytes(&bcs.1)?;
        Ok(git_info)
    }
}

impl fmt::Display for PackageInfoNetwork {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PackageInfoNetwork::Mainnet => write!(f, "mainnet"),
            PackageInfoNetwork::Testnet => write!(f, "testnet"),
        }
    }
}

impl fmt::Display for PackageInfo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "      Upgrade Cap ID: {}", self.upgrade_cap_id)?;
        writeln!(f, "      Package Address: {}", self.package_address)?;
        write!(f, "      Git Versioning: {:?}", self.git_versioning)
    }
}
