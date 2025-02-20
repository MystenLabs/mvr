use sui_sdk_macros::move_contract;

move_contract! {alias = "suins", package = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0"}

use crate::models::suins::*;

move_contract! {alias = "mvr_core", package = "@mvr/core"}
move_contract! {alias = "mvr_metadata", package = "@mvr/metadata"}
