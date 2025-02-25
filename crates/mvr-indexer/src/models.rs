use crate::models::mainnet::sui::vec_map::VecMap;
use std::collections::HashMap;
use std::hash::Hash;

pub mod mainnet {
    use move_binding_derive::move_contract;
    move_contract! {alias = "sui", package = "0x2"}
    move_contract! {alias = "suins", package = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0", deps = [crate::models::mainnet::sui]}
    move_contract! {alias = "mvr_core", package = "@mvr/core", deps = [crate::models::mainnet::sui, crate::models::mainnet::suins, crate::models::mvr_metadata]}
    move_contract! {alias = "mvr_metadata", package = "@mvr/metadata", deps = [crate::models::mainnet::sui]}
}
pub mod testnet {
    use move_binding_derive::move_contract;
    move_contract! {alias = "mvr_metadata", package = "@mvr/metadata", network = "testnet", deps = [crate::models::mainnet::sui]}
}

pub trait VecMapToHashMap<K, V> {
    fn to_map(self) -> HashMap<K, V>;
}

impl<K: Eq + Hash, V> VecMapToHashMap<K, V> for VecMap<K, V> {
    fn to_map(self) -> HashMap<K, V> {
        self.contents
            .into_iter()
            .map(|entry| (entry.key, entry.value))
            .collect::<HashMap<K, V>>()
    }
}
