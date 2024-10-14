use std::collections::HashMap;
use std::fmt;
use std::str::FromStr;

use anyhow::anyhow;
use anyhow::Result;
use serde::Deserialize;
use serde::Serialize;

use sui_client::DynamicFieldOutput;
use sui_types::types::ObjectId;
use sui_types::types::TypeTag;

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
        let package_info_typetag = TypeTag::from_str(
            "0x4433047b14865ef466c55c35ec0f8a55726628e729d21345f2c4673582ec15a8::package::PackageInfo",
        )?;
        df.deserialize_value(&package_info_typetag)
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

impl TryFrom<&DynamicFieldOutput> for GitInfo {
    type Error = anyhow::Error;

    fn try_from(df: &DynamicFieldOutput) -> Result<Self> {
        let git_info_typetag = TypeTag::from_str(
            "0x3f59564f9caa6769a2b16e30ab0756441bad340339858373c6c38bbc15f67eb9::git::GitInfo",
        )?;
        df.deserialize_value(&git_info_typetag)
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
