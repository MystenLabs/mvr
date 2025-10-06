use crate::models::mainnet::sui::vec_map::VecMap;
use std::collections::HashMap;
use std::hash::Hash;

pub mod mainnet {
    use move_binding_derive::move_contract;
    move_contract! { alias = "std", package = "0x1", base_path = crate::models::mainnet }
    move_contract! { alias = "sui", package = "0x2", base_path = crate::models::mainnet }
    move_contract! {alias = "suins", package = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0", network = "mainnet", base_path = crate::models::mainnet }
    move_contract! {alias = "mvr_metadata", package = "@mvr/metadata", network = "mainnet", base_path = crate::models::mainnet }
    move_contract! {alias = "mvr_core", package = "@mvr/core", network = "mainnet", base_path = crate::models::mainnet }
}
pub mod testnet {
    use move_binding_derive::move_contract;
    move_contract! {alias = "mvr_metadata", package = "@mvr/metadata", network = "testnet", base_path = crate::models::testnet }
}

impl<K: Eq + Hash, V> From<VecMap<K, V>> for HashMap<K, V> {
    fn from(value: VecMap<K, V>) -> Self {
        value
            .contents
            .into_iter()
            .map(|entry| (entry.key, entry.value))
            .collect::<HashMap<K, V>>()
    }
}
