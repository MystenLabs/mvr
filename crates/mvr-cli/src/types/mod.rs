pub mod api_data;
pub mod api_types;
pub mod resolver_alt;

use std::fmt;
use std::str::FromStr;

use serde::Deserialize;
use serde::Serialize;

use crate::errors::CliError;
use crate::MAINNET_CHAIN_ID;
use crate::TESTNET_CHAIN_ID;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MoveRegistryDependencies {
    pub packages: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, PartialOrd, Eq, Ord)]
pub enum Network {
    Mainnet,
    Testnet,
}

impl Network {
    pub fn try_from_chain_identifier(chain_identifier: &str) -> Result<Self, CliError> {
        match chain_identifier {
            MAINNET_CHAIN_ID => Ok(Network::Mainnet),
            TESTNET_CHAIN_ID => Ok(Network::Testnet),
            _ => Err(CliError::NetworkNotSupported),
        }
    }
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
    type Err = CliError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "mainnet" => Ok(Network::Mainnet),
            "testnet" => Ok(Network::Testnet),
            _ => Err(CliError::InvalidNetwork(s.to_string())),
        }
    }
}
