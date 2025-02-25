use crate::handlers::MoveObjectProcessor;
use crate::models::mainnet::sui::dynamic_field::Field;
use crate::models::{mainnet, testnet};
use anyhow::Error;
use async_trait::async_trait;
use diesel::query_dsl::methods::FilterDsl;
use diesel::upsert::excluded;
use diesel::ExpressionMethods;
use diesel_async::RunQueryDsl;
use move_types::MoveStruct;
use mvr_schema::models::GitInfo;
use serde::de::DeserializeOwned;
use std::marker::PhantomData;
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::concurrent::Handler;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_pg_db::Connection;
use sui_types::base_types::MoveObjectType;
use sui_types::full_checkpoint_content::CheckpointData;
use crate::handlers::convert_struct_tag;

pub type MainnetGitInfo = Field<u64, mainnet::mvr_metadata::git::GitInfo>;
pub type TestnetGitInfo = Field<u64, testnet::mvr_metadata::git::GitInfo>;

pub struct GitInfoHandler<T> {
    chain_id: String,
    type_: MoveObjectType,
    phantom_data: PhantomData<T>,
}

impl<T: MoveStruct> GitInfoHandler<T> {
    pub fn new(chain_id: String) -> Self {
        // Indexing dynamic field object Field<u64, [metadata_pkg_id]::git::GitInfo>
        let struct_tag = Field::<u64, MoveGitInfo>::struct_type();
        GitInfoHandler {
            chain_id,
            type_: MoveObjectType::from(convert_struct_tag(struct_tag)),
            phantom_data: Default::default(),
        }
    }
}

impl MoveObjectProcessor<MainnetGitInfo, GitInfo> for GitInfoHandler<MainnetGitInfo> {
    const PROC_NAME: &'static str = "GitInfo - Mainnet";

    fn process_move_object(
        chain_id: String,
        move_obj: MainnetGitInfo,
        obj: &Object,
    ) -> Result<GitInfo, Error> {
        let mainnet::mvr_metadata::git::GitInfo {
            repository,
            path,
            tag,
        } = move_obj.value;
        Ok(GitInfo {
            table_id: obj.owner.get_owner_address()?.to_string(),
            object_version: obj.version().value() as i64,
            version: move_obj.name as i32,
            chain_id,
            repository: Some(repository),
            path: Some(path),
            tag: Some(tag),
        })
    }
}

impl MoveObjectProcessor<TestnetGitInfo, GitInfo> for GitInfoHandler<TestnetGitInfo> {
    const PROC_NAME: &'static str = "GitInfo - Testnet";

    fn process_move_object(
        chain_id: String,
        move_obj: TestnetGitInfo,
        obj: &Object,
    ) -> Result<GitInfo, Error> {
        let testnet::mvr_metadata::git::GitInfo {
            repository,
            path,
            tag,
        } = move_obj.value;
        Ok(GitInfo {
            table_id: obj.owner.get_owner_address()?.to_string(),
            object_version: obj.version().value() as i64,
            version: move_obj.name as i32,
            chain_id,
            repository: Some(repository),
            path: Some(path),
            tag: Some(tag),
        })
    }
}

#[async_trait]
impl<T: MoveStruct + DeserializeOwned> Handler for GitInfoHandler<T>
where
    Self: MoveObjectProcessor<T, GitInfo>,
{
    async fn commit(values: &[Self::Value], conn: &mut Connection<'_>) -> anyhow::Result<usize> {
        use mvr_schema::schema::git_infos::columns::*;
        use mvr_schema::schema::git_infos::dsl::git_infos;
        Ok(diesel::insert_into(git_infos)
            .values(values)
            .on_conflict((table_id, version))
            .do_update()
            .set((
                object_version.eq(excluded(object_version)),
                repository.eq(excluded(repository)),
                path.eq(excluded(path)),
                tag.eq(excluded(tag)),
            ))
            .filter(object_version.lt(excluded(object_version)))
            .execute(conn)
            .await?)
    }
}

impl<T: MoveStruct + DeserializeOwned> Processor for GitInfoHandler<T>
where
    Self: MoveObjectProcessor<T, GitInfo>,
{
    const NAME: &'static str = Self::PROC_NAME;
    type Value = GitInfo;

    fn process(&self, checkpoint: &Arc<CheckpointData>) -> anyhow::Result<Vec<Self::Value>> {
        checkpoint
            .transactions
            .iter()
            .try_fold(vec![], |result, tx| {
                tx.output_objects.iter().try_fold(result, |mut result, o| {
                    if matches!(o.type_(), Some(t) if t == &self.type_) {
                        if let Some(move_obj) = o.data.try_as_move() {
                            result.push(Self::process_move_object(
                                self.chain_id.clone(),
                                bcs::from_bytes(move_obj.contents())?,
                                o,
                            )?)
                        }
                    }
                    Ok(result)
                })
            })
    }
}
