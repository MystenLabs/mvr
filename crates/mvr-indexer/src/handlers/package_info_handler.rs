use async_trait::async_trait;
use diesel::upsert::excluded;
use diesel_async::RunQueryDsl;
use move_core_types::ident_str;
use move_core_types::language_storage::StructTag;
use mvr_schema::models::PackageInfo;
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::concurrent::Handler;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_pg_db::Connection;
use sui_sdk_types::ObjectId;
use sui_types::base_types::MoveObjectType;
use sui_types::full_checkpoint_content::CheckpointData;
use diesel::ExpressionMethods;
pub struct PackageInfoHandler {
    type_: MoveObjectType,
}

impl PackageInfoHandler {
    pub fn new(metadata_pkg_id: ObjectId) -> Self {
        // Indexing object [metadata_pkg_id]::package_info::PackageInfo
        let pkg_info_type = StructTag {
            address: (*metadata_pkg_id.inner()).into(),
            module: ident_str!("package_info").into(),
            name: ident_str!("PackageInfo").into(),
            type_params: vec![],
        };
        let type_ = MoveObjectType::from(pkg_info_type);
        PackageInfoHandler { type_ }
    }
}

#[async_trait]
impl Handler for PackageInfoHandler {
    async fn commit(values: &[Self::Value], conn: &mut Connection<'_>) -> anyhow::Result<usize> {
        use mvr_schema::schema::package_infos::dsl::package_infos;
        use mvr_schema::schema::package_infos::columns::*;
        Ok(diesel::insert_into(package_infos)
            .values(values)
            .on_conflict(id)
            .do_update()
            .set((
                package_id.eq(excluded(package_id)),
                git_table_id.eq(excluded(git_table_id)),
                default_name.eq(excluded(default_name)),
                metadata.eq(excluded(metadata))
            ))
            .execute(conn)
            .await?)
    }
}

impl Processor for PackageInfoHandler {
    const NAME: &'static str = "PackageInfo";
    type Value = PackageInfo;

    fn process(&self, checkpoint: &Arc<CheckpointData>) -> anyhow::Result<Vec<Self::Value>> {
        checkpoint.transactions.iter().try_fold(vec![], |result, tx| {
            tx.output_objects.iter().try_fold(result, |mut result, obj| {
                if matches!(obj.type_(), Some(t) if t == &self.type_) {
                    if let Some(move_obj) = obj.data.try_as_move() {
                        use crate::models::mvr_metadata::package_info::PackageInfo as MovePackageInfo;
                        let MovePackageInfo { id, display, upgrade_cap_id: _, package_address, metadata, git_versioning } = bcs::from_bytes(move_obj.contents())?;
                        result.push(PackageInfo {
                            id: id.to_string(),
                            package_id: package_address.to_string(),
                            git_table_id: git_versioning.id.to_hex_uncompressed(),
                            default_name: Some(display.name),
                            metadata: serde_json::to_value(metadata)?,
                        })
                    }
                }
                Ok(result)
            })
        })
    }
}
