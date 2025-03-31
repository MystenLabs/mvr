pub mod api_types;

use std::fmt;
use std::str::FromStr;

use serde::Deserialize;
use serde::Serialize;

#[derive(Serialize, Default, Debug)]
pub struct MoveTomlPublishedID {
    pub addresses_id: Option<String>,
    pub published_at_id: Option<String>,
    pub internal_pkg_name: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MoveRegistryDependencies {
    pub network: Network,
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

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub enum Network {
    Mainnet,
    Testnet,
}

impl fmt::Display for Network {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Network::Mainnet => write!(f, "mainnet"),
            Network::Testnet => write!(f, "testnet"),
        }
    }
}

impl FromStr for Network {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "mainnet" => Ok(Network::Mainnet),
            "testnet" => Ok(Network::Testnet),
            _ => Err(anyhow::anyhow!(
                "Invalid network: {:?}. The only supported networks are `mainnet` and `testnet`.",
                s
            )),
        }
    }
}
