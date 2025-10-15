use std::cmp::Ordering;
use std::collections::BTreeMap;
use std::hash::Hash;
use std::slice::Iter;
use sui_types::object::Object;

pub mod git_info_handler;
pub mod name_record_handler;
pub mod package_handler;
pub mod package_info_handler;

use async_trait::async_trait;
use move_core_types::language_storage::StructTag as MoveStructTag;
use mvr_schema::models::Package;
use std::str::FromStr;
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::concurrent::Handler;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_pg_db::{Connection, Db};
use sui_sdk_types::StructTag;
use sui_types::full_checkpoint_content::CheckpointData;
use tracing::info;

// Convert rust sdk struct tag to move struct tag.
pub fn convert_struct_tag(tag: StructTag) -> MoveStructTag {
    MoveStructTag::from_str(&tag.to_string()).unwrap()
}
pub trait MoveObjectProcessor<T, R> {
    const PROC_NAME: &'static str;
    fn process_move_object(chain_id: String, move_obj: T, obj: &Object)
        -> Result<R, anyhow::Error>;
}

/// Dedupe with ordering
pub trait OrderedDedup {
    type Item;

    fn cmp_dedup<K, O, Key>(self, key_by: K, o: O) -> Vec<Self::Item>
    where
        Self::Item: Clone,
        Key: Eq + Hash + Ord,
        K: Fn(&Self::Item) -> Key,
        O: Fn(&Self::Item, &Self::Item) -> Ordering;
}

impl<T> OrderedDedup for Iter<'_, T> {
    type Item = T;
    fn cmp_dedup<K, C, Key>(self, key: K, cmp: C) -> Vec<Self::Item>
    where
        Self::Item: Clone,
        Key: Eq + Hash + Ord,
        K: Fn(&Self::Item) -> Key,
        C: Fn(&Self::Item, &Self::Item) -> Ordering,
    {
        let map = self.fold(BTreeMap::new(), |mut results, value| {
            let key = key(value);
            if !matches!(results.get(&key), Some(existing_value) if cmp(existing_value, value).is_gt()) {
                results.insert(key, value.clone());
            }
            results
        });
        map.values().cloned().collect()
    }
}

#[cfg(test)]
mod test {
    use crate::handlers::OrderedDedup;
    #[test]
    fn test_cmp_dedup() {
        let values = vec![("a", 1), ("a", 2), ("b", 1), ("b", 3), ("c", 4)];
        let result = values.iter().cmp_dedup(|v| v.0, |v1, v2| v1.1.cmp(&v2.1));
        let expected = vec![("a", 2), ("b", 3), ("c", 4)];
        assert_eq!(expected, result)
    }
}

pub struct NoOpsHandler;

#[async_trait]
impl Handler for NoOpsHandler {
    type Store = Db;

    async fn commit<'a>(_: &[Self::Value], _: &mut Connection<'a>) -> anyhow::Result<usize> {
        Ok(0)
    }
}

#[async_trait]
impl Processor for NoOpsHandler {
    const NAME: &'static str = "No Ops Handler";
    type Value = Package;

    async fn process(&self, checkpoint: &Arc<CheckpointData>) -> anyhow::Result<Vec<Self::Value>> {
        info!(
            "Processed checkpoint: {}",
            checkpoint.checkpoint_summary.sequence_number
        );
        Ok(vec![])
    }
}
