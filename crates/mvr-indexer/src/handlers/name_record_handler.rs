use crate::models::mvr_core;
use crate::models::mvr_core::name::Name;
use async_trait::async_trait;
use diesel::upsert::excluded;
use diesel::ExpressionMethods;
use diesel_async::RunQueryDsl;
use itertools::Itertools;
use mvr_schema::models::NameRecord;
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::concurrent::Handler;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_pg_db::Connection;
use sui_types::base_types::MoveObjectType;
use sui_types::dynamic_field::{DynamicFieldInfo, Field};
use sui_types::full_checkpoint_content::CheckpointData;

const TESTNET_KEY: &str = "testnet";

pub struct NameRecordHandler {
    type_: MoveObjectType,
}

impl NameRecordHandler {
    pub fn new() -> Self {
        // Indexing dynamic field object Field<[mvr_core]::name::Name, [mvr_core]::app_record::AppRecord>
        let name_type = mvr_core::name::Name::type_();
        let app_record = mvr_core::app_record::AppRecord::type_();
        let type_ = MoveObjectType::from(DynamicFieldInfo::dynamic_field_type(
            name_type.into(),
            app_record.into(),
        ));
        NameRecordHandler { type_ }
    }
}
#[async_trait]
impl Handler for NameRecordHandler {
    async fn commit(values: &[Self::Value], conn: &mut Connection<'_>) -> anyhow::Result<usize> {
        use mvr_schema::schema::name_records::dsl::name_records;
        use mvr_schema::schema::name_records::columns::*;
        Ok(diesel::insert_into(name_records)
            .values(values)
            .on_conflict(name)
            .do_update()
            .set((
                mainnet_id.eq(excluded(mainnet_id)),
                testnet_id.eq(excluded(testnet_id)),
                metadata.eq(excluded(metadata))
            ))
            .execute(conn)
            .await?)
    }
}

impl Processor for NameRecordHandler {
    const NAME: &'static str = "NameRecord";
    type Value = NameRecord;

    fn process(&self, checkpoint: &Arc<CheckpointData>) -> anyhow::Result<Vec<Self::Value>> {
        checkpoint
            .transactions
            .iter()
            .try_fold(vec![], |result, tx| {
                tx.output_objects.iter().try_fold(result, |mut result, o| {
                    if matches!(o.type_(), Some(t) if t == &self.type_) {
                        if let Some(move_obj) = o.data.try_as_move() {
                            use crate::models::mvr_core::app_record::AppRecord as MoveAppRecord;
                            let data: Field<Name, MoveAppRecord> =
                                bcs::from_bytes(move_obj.contents())?;
                            let Name { org, app } = data.name;
                            let MoveAppRecord {
                                app_info,
                                networks,
                                metadata,
                                ..
                            } = data.value;
                            result.push(NameRecord {
                                // TODO: use correct name to string
                                name: format!("{org:?}/{}", app.join("/")),
                                mainnet_id: app_info
                                    .and_then(|info| Some(info.package_info_id?.to_string())),
                                testnet_id: networks
                                    .get(&TESTNET_KEY.into())
                                    .and_then(|info| Some(info.package_info_id?.to_string())),
                                metadata: serde_json::to_value(metadata)?,
                            })
                        }
                    }
                    Ok(result)
                })
            })
    }
}
