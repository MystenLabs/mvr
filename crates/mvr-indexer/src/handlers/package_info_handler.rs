use crate::handlers::{convert_struct_tag, OrderedDedup};
use crate::handlers::{into_hash_map, MoveObjectProcessor};
use crate::models::mainnet::PackageInfo as MainnetPackageInfo;
use crate::models::testnet::PackageInfo as TestnetPackageInfo;
use crate::models::MoveStructType;
use async_trait::async_trait;
use diesel::query_dsl::methods::FilterDsl;
use diesel::upsert::excluded;
use diesel::ExpressionMethods;
use diesel_async::RunQueryDsl;
use mvr_schema::models::PackageInfo;
use serde::de::DeserializeOwned;
use std::marker::PhantomData;
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_indexer_alt_framework::postgres::{handler::Handler, Connection};
use sui_indexer_alt_framework::types::full_checkpoint_content::Checkpoint;
use sui_sdk_types::Address;
use sui_types::collection_types::VecMap;
use sui_types::object::Object;

const DEFAULT_NAME_KEY: &str = "default";

pub struct PackageInfoHandler<T> {
    chain_id: String,
    phantom_data: PhantomData<T>,
}

impl<T> PackageInfoHandler<T> {
    pub fn new(chain_id: String) -> Self {
        Self {
            chain_id,
            phantom_data: Default::default(),
        }
    }
    fn package_info(
        chain_id: String,
        id: Address,
        package_addr: Address,
        metadata: VecMap<String, String>,
        git_table_id: Address,
        object_version: u64,
    ) -> Result<PackageInfo, anyhow::Error> {
        let metadata = into_hash_map(metadata);
        Ok(PackageInfo {
            id: id.to_string(),
            object_version: object_version as i64,
            package_id: package_addr.to_string(),
            git_table_id: git_table_id.to_string(),
            chain_id,
            default_name: metadata.get(&DEFAULT_NAME_KEY.to_string()).cloned(),
            metadata: serde_json::to_value(metadata)?,
        })
    }
}

// impl for mainnet PackageInfo
impl MoveObjectProcessor<MainnetPackageInfo, PackageInfo>
    for PackageInfoHandler<MainnetPackageInfo>
{
    const PROC_NAME: &'static str = "PackageInfo - Mainnet";
    fn process_move_object(
        chain_id: String,
        move_obj: MainnetPackageInfo,
        obj: &Object,
    ) -> Result<PackageInfo, anyhow::Error> {
        let MainnetPackageInfo {
            id,
            package_address,
            metadata,
            git_versioning,
            ..
        } = move_obj;
        Self::package_info(
            chain_id,
            id,
            package_address,
            metadata,
            Address::from_hex(git_versioning.id.to_hex_uncompressed())
                .expect("Addresses should be valid when coming from the chain"),
            obj.version().value(),
        )
    }
}

// impl for testnet PackageInfo
impl MoveObjectProcessor<TestnetPackageInfo, PackageInfo>
    for PackageInfoHandler<TestnetPackageInfo>
{
    const PROC_NAME: &'static str = "PackageInfo - Testnet";
    fn process_move_object(
        chain_id: String,
        move_obj: TestnetPackageInfo,
        obj: &Object,
    ) -> Result<PackageInfo, anyhow::Error> {
        let TestnetPackageInfo {
            id,
            package_address,
            metadata,
            git_versioning,
            ..
        } = move_obj;
        Self::package_info(
            chain_id,
            id,
            package_address,
            metadata,
            Address::from_hex(git_versioning.id.to_hex_uncompressed())
                .expect("Addresses should be valid when coming from the chain"),
            obj.version().value(),
        )
    }
}

#[async_trait]
impl<T: MoveStructType + DeserializeOwned + Send + Sync + 'static> Handler for PackageInfoHandler<T>
where
    Self: MoveObjectProcessor<T, PackageInfo>,
{
    async fn commit<'a>(
        values: &[Self::Value],
        conn: &mut Connection<'a>,
    ) -> anyhow::Result<usize> {
        use mvr_schema::schema::package_infos::columns::*;
        use mvr_schema::schema::package_infos::dsl::package_infos;

        // dedup values to avoid affecting same row twice
        let values = values.iter().cmp_dedup(
            |v| v.id.clone(),
            |v1, v2| v1.object_version.cmp(&v2.object_version),
        );

        Ok(diesel::insert_into(package_infos)
            .values(values)
            .on_conflict(id)
            .do_update()
            .set((
                package_id.eq(excluded(package_id)),
                git_table_id.eq(excluded(git_table_id)),
                default_name.eq(excluded(default_name)),
                metadata.eq(excluded(metadata)),
            ))
            .filter(object_version.lt(excluded(object_version)))
            .execute(conn)
            .await?)
    }
}

#[async_trait]
impl<T: MoveStructType + DeserializeOwned + Send + Sync + 'static> Processor
    for PackageInfoHandler<T>
where
    Self: MoveObjectProcessor<T, PackageInfo>,
{
    const NAME: &'static str = Self::PROC_NAME;
    type Value = PackageInfo;

    async fn process(&self, checkpoint: &Arc<Checkpoint>) -> anyhow::Result<Vec<Self::Value>> {
        checkpoint.transactions.iter().try_fold(vec![], |result, tx| {
            tx.output_objects(&checkpoint.object_set).try_fold(result, |mut result, obj| {
                if matches!(obj.type_(), Some(t) if matches!(t.other(), Some(s) if s == &convert_struct_tag(T::struct_type())) ) {
                    if let Some(move_obj) = obj.data.try_as_move() {
                        let move_obj: T = bcs::from_bytes(move_obj.contents())?;
                        result.push(Self::process_move_object(self.chain_id.clone(), move_obj, obj)?)
                    }
                }
                Ok(result)
            })
        })
    }
}
