use std::fmt;
use yansi::Paint;

use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PackageRequest {
    pub name: String,
    pub metadata: serde_json::Value,
    pub package_info: Option<PackageInfo>,
    pub git_info: Option<GitInfo>,
    pub version: u64,
    pub package_address: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PackageInfo {
    pub id: String,
    pub git_table_id: String,
    pub default_name: Option<String>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitInfo {
    pub repository_url: Option<String>,
    pub path: Option<String>,
    pub tag: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SafeGitInfo {
    pub repository_url: String,
    pub path: String,
    pub tag: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResolutionResponse {
    pub package_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchNamesResponse {
    pub data: Vec<SinglePackageSearchResult>,
    pub next_cursor: Option<String>,
    pub limit: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SinglePackageSearchResult {
    pub name: String,
    pub metadata: serde_json::Value,
    pub mainnet_package_info_id: Option<String>,
    pub testnet_package_info_id: Option<String>,
}

impl fmt::Display for PackageRequest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let output = serde_json::to_string_pretty(self).unwrap();
        write!(f, "{}", output)
    }
}

impl PackageRequest {
    pub fn get_git_info(&self) -> Result<GitInfo> {
        let Some(git_info) = &self.git_info else {
            bail!(
                "{} {} {} {} {}",
                "Version".red(),
                self.version.red().bold(),
                "of".red(),
                self.name.red().bold(),
                "does not have git information specified."
            )
        };

        Ok(git_info.clone())
    }
}

impl TryFrom<GitInfo> for SafeGitInfo {
    type Error = anyhow::Error;

    fn try_from(git_info: GitInfo) -> Result<Self, Self::Error> {
        if git_info.repository_url.is_none() {
            bail!(
                "Repository URL is not specified in the GitInfo: {:?}",
                git_info
            );
        }

        if git_info.tag.is_none() {
            bail!("Tag is not specified in the GitInfo: {:?}", git_info);
        }

        Ok(SafeGitInfo {
            repository_url: git_info.repository_url.unwrap(),
            path: git_info.path.unwrap_or_default(),
            tag: git_info.tag.unwrap_or_default(),
        })
    }
}
