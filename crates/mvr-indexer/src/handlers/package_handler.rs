use crate::{MAINNET_CHAIN_ID, TESTNET_CHAIN_ID};
use chrono::DateTime;
use diesel_async::RunQueryDsl;
use itertools::Itertools;
use mvr_schema::models::{Package, PackageDependency};
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::concurrent::Handler;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_pg_db::Connection;
use sui_types::full_checkpoint_content::CheckpointData;
use sui_types::object::Data;

pub struct PackageHandler<const MAINNET: bool>;

impl<const MAINNET: bool> PackageHandler<MAINNET> {
    const CHAIN_ID: &'static str = if MAINNET {
        MAINNET_CHAIN_ID
    } else {
        TESTNET_CHAIN_ID
    };
}

#[async_trait::async_trait]
impl<const MAINNET: bool> Handler for PackageHandler<MAINNET> {
    async fn commit(values: &[Self::Value], conn: &mut Connection<'_>) -> anyhow::Result<usize> {
        use mvr_schema::schema::package_dependencies::dsl::package_dependencies;
        use mvr_schema::schema::packages::dsl::packages;

        let deps = values
            .iter()
            .flat_map(|p| {
                p.deps
                    .iter()
                    .cloned()
                    .map(|dependency_package_id| PackageDependency {
                        package_id: p.package_id.clone(),
                        dependency_package_id,
                        chain_id: p.chain_id.clone(),
                    })
            })
            .collect::<Vec<_>>();

        let insert_package = diesel::insert_into(packages)
            .values(values)
            .on_conflict_do_nothing()
            .execute(conn)
            .await?;

        let insert_deps = diesel::insert_into(package_dependencies)
            .values(deps)
            .on_conflict_do_nothing()
            .execute(conn)
            .await?;

        Ok(insert_package + insert_deps)
    }
}

impl<const MAINNET: bool> Processor for PackageHandler<MAINNET> {
    const NAME: &'static str = if MAINNET {
        "Package - Mainnet"
    } else {
        "Package - Testnet"
    };
    type Value = Package;

    fn process(&self, checkpoint: &Arc<CheckpointData>) -> anyhow::Result<Vec<Self::Value>> {
        let timestamp =
            DateTime::from_timestamp_millis(checkpoint.checkpoint_summary.timestamp_ms as i64)
                .unwrap()
                .naive_utc();

        checkpoint
            .transactions
            .iter()
            .try_fold(vec![], |results, tx| {
                tx.output_objects
                    .iter()
                    .try_fold(results, |mut results, o| {
                        if let Data::Package(p) = &o.data {
                            let package_id = p.id().to_hex_uncompressed();
                            let deps = p
                                .linkage_table()
                                .iter()
                                .map(|(id, i)| id.to_hex_uncompressed())
                                .dedup()
                                .collect();
                            results.push(Package {
                                package_id,
                                original_id: p.original_package_id().to_hex_uncompressed(),
                                package_version: p.version().value() as i64,
                                move_package: bcs::to_bytes(p)?,
                                chain_id: Self::CHAIN_ID.to_string(),
                                tx_hash: tx.transaction.digest().base58_encode(),
                                sender: tx.transaction.sender_address().to_string(),
                                timestamp,
                                deps,
                            })
                        }
                        Ok(results)
                    })
            })
    }
}
