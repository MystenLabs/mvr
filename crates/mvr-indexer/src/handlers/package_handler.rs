use crate::{MAINNET_CHAIN_ID, TESTNET_CHAIN_ID};
use async_trait::async_trait;
use chrono::DateTime;
use diesel_async::RunQueryDsl;
use itertools::Itertools;
use move_binary_format::CompiledModule;
use mvr_schema::models::{Package, PackageDependency};
use std::collections::HashSet;
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_indexer_alt_framework::postgres::{handler::Handler, Connection};
use sui_indexer_alt_framework::types::full_checkpoint_content::Checkpoint;
use sui_types::base_types::ObjectID;
use sui_types::move_package::MovePackage;
use sui_types::object::Data;
use sui_types::transaction::TransactionDataAPI;

pub struct PackageHandler<const MAINNET: bool>;

impl<const MAINNET: bool> PackageHandler<MAINNET> {
    const CHAIN_ID: &'static str = if MAINNET {
        MAINNET_CHAIN_ID
    } else {
        TESTNET_CHAIN_ID
    };
}

#[async_trait]
impl<const MAINNET: bool> Handler for PackageHandler<MAINNET> {
    async fn commit<'a>(
        values: &[Self::Value],
        conn: &mut Connection<'a>,
    ) -> anyhow::Result<usize> {
        use mvr_schema::schema::package_dependencies::dsl::package_dependencies;
        use mvr_schema::schema::packages::dsl::packages;

        let deps = values.iter().flat_map(|p| &p.deps).collect::<Vec<_>>();

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

#[async_trait]
impl<const MAINNET: bool> Processor for PackageHandler<MAINNET> {
    const NAME: &'static str = if MAINNET {
        "Package - Mainnet"
    } else {
        "Package - Testnet"
    };
    type Value = Package;

    async fn process(&self, checkpoint: &Arc<Checkpoint>) -> anyhow::Result<Vec<Self::Value>> {
        let timestamp = DateTime::from_timestamp_millis(checkpoint.summary.timestamp_ms as i64)
            .unwrap()
            .naive_utc();

        let mut results = vec![];
        for tx in &checkpoint.transactions {
            for o in tx.output_objects(&checkpoint.object_set) {
                if let Data::Package(p) = &o.data {
                    let package_id = p.id().to_hex_uncompressed();
                    let deps = package_dependencies(Self::CHAIN_ID.to_string(), p)?;
                    results.push(Package {
                        package_id,
                        original_id: p.original_package_id().to_hex_uncompressed(),
                        package_version: p.version().value() as i64,
                        move_package: bcs::to_bytes(p)?,
                        chain_id: Self::CHAIN_ID.to_string(),
                        tx_hash: tx.transaction.digest().base58_encode(),
                        sender: tx.transaction.sender().to_string(),
                        timestamp,
                        deps,
                    })
                }
            }
        }
        Ok(results)
    }
}

pub fn package_dependencies(
    chain_id: String,
    package: &MovePackage,
) -> Result<Vec<PackageDependency>, anyhow::Error> {
    let package_id = package.id().to_hex_uncompressed();
    let mut immediate_dependencies = HashSet::new();
    for (_, bytes) in package.serialized_module_map() {
        let module = CompiledModule::deserialize_with_defaults(bytes)?;
        immediate_dependencies.extend(
            module
                .immediate_dependencies()
                .into_iter()
                .map(|dep| ObjectID::from(*dep.address())),
        );
    }
    Ok(package
        .linkage_table()
        .iter()
        .map(|(_, u)| u.upgraded_id)
        .dedup()
        .map(|dependency_package_id| PackageDependency {
            package_id: package_id.clone(),
            dependency_package_id: dependency_package_id.to_hex_uncompressed(),
            chain_id: chain_id.clone(),
            immediate_dependency: immediate_dependencies.contains(&dependency_package_id),
        })
        .collect())
}
