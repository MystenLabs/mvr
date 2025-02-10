use crate::models::{Package, SuiEnv};
use diesel_async::RunQueryDsl;
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
        use crate::schema::packages::dsl::packages;
        Ok(diesel::insert_into(packages)
            .values(values)
            .on_conflict_do_nothing()
            .execute(conn)
            .await?)
    }
}

impl Processor for PackageHandler {
    const NAME: &'static str = "Package";
    type Value = Package;

    fn process(&self, checkpoint: &Arc<CheckpointData>) -> anyhow::Result<Vec<Self::Value>> {
        // todo: store sui env as well in case we need to clean up testnet data after wipe.
        checkpoint
            .transactions
            .iter()
            .try_fold(vec![], |mut results, tx| {
                if contain_package(tx) {
                    results.append(
                        &mut tx
                            .output_objects
                            .iter()
                            .map(|o| {
                                o.data
                                    .try_as_package()
                                    .iter()
                                    .map(|p| {
                                        Ok::<_, anyhow::Error>(Package {
                                            package_id: p.id().to_hex_literal(),
                                            original_id: p.original_package_id().to_hex_literal(),
                                            package_version: p.version().value() as i64,
                                            move_package: bcs::to_bytes(p)?,
                                        })
                                    })
                                    .collect::<Vec<_>>()
                            })
                            .flatten()
                            .collect::<anyhow::Result<Vec<_>>>()?,
                    )
                }
                Ok(results)
            })
    }
}

fn contain_package(tx: &CheckpointTransaction) -> bool {
    tx.output_objects.iter().any(|o| o.is_package())
}
