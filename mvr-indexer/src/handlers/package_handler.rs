use crate::models::{Package, PackageDependency, SuiEnv};
use chrono::DateTime;
use diesel_async::RunQueryDsl;
use itertools::Itertools;
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::concurrent::Handler;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_pg_db::Connection;
use sui_sdk::types::full_checkpoint_content::{CheckpointData, CheckpointTransaction};

pub struct PackageHandler {
    sui_env: SuiEnv,
}

impl PackageHandler {
    pub fn new(sui_env: SuiEnv) -> Self {
        Self { sui_env }
    }
}

#[async_trait::async_trait]
impl Handler for PackageHandler {
    async fn commit(values: &[Self::Value], conn: &mut Connection<'_>) -> anyhow::Result<usize> {
        use crate::schema::package_dependencies::dsl::package_dependencies;
        use crate::schema::packages::dsl::packages;

        let deps = values
            .iter()
            .flat_map(|p| {
                p.deps
                    .iter()
                    .cloned()
                    .map(|dependency_package_id| PackageDependency {
                        package_id: p.package_id.clone(),
                        dependency_package_id,
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

impl Processor for PackageHandler {
    const NAME: &'static str = "Package";
    type Value = Package;

    fn process(&self, checkpoint: &Arc<CheckpointData>) -> anyhow::Result<Vec<Self::Value>> {
        let timestamp =
            DateTime::from_timestamp_millis(checkpoint.checkpoint_summary.timestamp_ms as i64)
                .unwrap()
                .naive_utc();

        checkpoint
            .transactions
            .iter()
            .try_fold(vec![], |mut results, tx| {
                if contain_package(tx) {
                    let mut package = tx
                        .output_objects
                        .iter()
                        .map(|o| {
                            o.data.try_as_package().map(|p| {
                                let package_id = p.id().to_hex_literal();
                                let deps = p
                                    .linkage_table()
                                    .iter()
                                    .map(|(id, _)| id.to_hex_literal())
                                    .dedup()
                                    .collect();
                                Ok::<_, anyhow::Error>(Package {
                                    package_id,
                                    original_id: p.original_package_id().to_hex_literal(),
                                    package_version: p.version().value() as i64,
                                    move_package: bcs::to_bytes(p)?,
                                    chain_id: self.sui_env.to_string(),
                                    tx_hash: tx.transaction.digest().base58_encode(),
                                    sender: tx.transaction.sender_address().to_string(),
                                    timestamp,
                                    deps,
                                })
                            })
                        })
                        .flatten()
                        .collect::<anyhow::Result<Vec<_>>>()?;
                    results.append(&mut package)
                }
                Ok(results)
            })
    }
}

fn contain_package(tx: &CheckpointTransaction) -> bool {
    tx.output_objects.iter().any(|o| o.is_package())
}
