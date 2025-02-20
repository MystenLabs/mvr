use anyhow::anyhow;
use std::fmt::{Display, Formatter};
use std::str::FromStr;
use sui_sdk_macros::move_contract;

move_contract! {alias = "suins", package = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0"}

use crate::models::suins::*;

move_contract! {alias = "mvr_core", package = "@mvr/core"}
move_contract! {alias = "mvr_metadata", package = "@mvr/metadata"}

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
