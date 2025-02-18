use async_trait::async_trait;
use diesel_async::RunQueryDsl;
use move_core_types::ident_str;
use move_core_types::language_storage::{StructTag, TypeTag};
use mvr_schema::models::GitInfo;
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::concurrent::Handler;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_pg_db::Connection;
use sui_sdk_types::ObjectId;
use sui_types::base_types::MoveObjectType;
use sui_types::dynamic_field::{DynamicFieldInfo, Field};
use sui_types::full_checkpoint_content::CheckpointData;

pub struct GitInfoHandler {
    type_: MoveObjectType,
}

impl GitInfoHandler {
    pub fn new(metadata_pkg_id: ObjectId) -> Self {
        // Indexing dynamic field object Field<u64, [metadata_pkg_id]::git::GitInfo>
        let git_type = StructTag {
            address: (*metadata_pkg_id.inner()).into(),
            module: ident_str!("git").into(),
            name: ident_str!("GitInfo").into(),
            type_params: vec![],
        };

        let type_ = MoveObjectType::from(DynamicFieldInfo::dynamic_field_type(
            TypeTag::U64,
            TypeTag::Struct(git_type.into()),
        ));

        GitInfoHandler {
            type_,
        }
    }
}

#[async_trait]
impl Handler for GitInfoHandler {
    async fn commit(values: &[Self::Value], conn: &mut Connection<'_>) -> anyhow::Result<usize> {
        use mvr_schema::schema::git_infos::dsl::git_infos;
        Ok(diesel::insert_into(git_infos)
            .values(values)
            .on_conflict_do_nothing()
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
                            use crate::models::mvr_metadata::git::GitInfo as MoveGitInfo;
                            let data: Field<u64, MoveGitInfo> =
                                bcs::from_bytes(move_obj.contents())?;
                            let MoveGitInfo {
                                repository,
                                path,
                                tag,
                            } = data.value;
                            result.push(GitInfo {
                                table_id: o.owner.get_owner_address()?.to_string(),
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
