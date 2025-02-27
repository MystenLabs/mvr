use crate::models::mvr_metadata::git::GitInfo as MoveGitInfo;
use crate::models::sui::dynamic_field::Field;
use async_trait::async_trait;
use diesel::query_dsl::methods::FilterDsl;
use diesel::upsert::excluded;
use diesel::ExpressionMethods;
use diesel_async::RunQueryDsl;
use move_types::MoveStruct;
use mvr_schema::models::GitInfo;
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::concurrent::Handler;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_pg_db::Connection;
use sui_types::base_types::MoveObjectType;
use sui_types::full_checkpoint_content::CheckpointData;
use crate::handlers::convert_struct_tag;

pub struct GitInfoHandler {
    type_: MoveObjectType,
}

impl GitInfoHandler {
    pub fn new() -> Self {
        // Indexing dynamic field object Field<u64, [metadata_pkg_id]::git::GitInfo>
        let struct_tag = Field::<u64, MoveGitInfo>::struct_type();
        GitInfoHandler {
            type_: MoveObjectType::from(convert_struct_tag(struct_tag)),
        }
    }
}

#[async_trait]
impl Handler for GitInfoHandler {
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

impl Processor for GitInfoHandler {
    const NAME: &'static str = "GitInfo";
    type Value = GitInfo;

    fn process(&self, checkpoint: &Arc<CheckpointData>) -> anyhow::Result<Vec<Self::Value>> {
        checkpoint
            .transactions
            .iter()
            .try_fold(vec![], |result, tx| {
                tx.output_objects.iter().try_fold(result, |mut result, o| {
                    if matches!(o.type_(), Some(t) if t == &self.type_) {
                        if let Some(move_obj) = o.data.try_as_move() {
                            let data: Field<u64, MoveGitInfo> =
                                bcs::from_bytes(move_obj.contents())?;
                            let MoveGitInfo {
                                repository,
                                path,
                                tag,
                            } = data.value;
                            result.push(GitInfo {
                                table_id: o.owner.get_owner_address()?.to_string(),
                                object_version: o.version().value() as i64,
                                version: data.name as i32,
                                repository: Some(repository),
                                path: Some(path),
                                tag: Some(tag),
                            })
                        }
                    }
                    Ok(result)
                })
            })
    }
}
