use crate::handlers::convert_struct_tag;
use crate::models::mainnet::mvr_core::app_record::AppRecord;
use crate::models::mainnet::mvr_core::name::Name as MoveName;
use crate::models::mainnet::sui::dynamic_field::Field;
use async_trait::async_trait;
use diesel::query_dsl::methods::FilterDsl;
use diesel::upsert::excluded;
use diesel::ExpressionMethods;
use diesel_async::RunQueryDsl;
use move_types::MoveStruct;
use mvr_schema::models::NameRecord;
use mvr_types::name::Name;
use mvr_types::name_service::Domain;
use std::collections::HashMap;
use std::sync::Arc;
use sui_indexer_alt_framework::pipeline::concurrent::Handler;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_pg_db::Connection;
use sui_types::base_types::MoveObjectType;
use sui_types::full_checkpoint_content::CheckpointData;

pub struct NameRecordHandler {
    type_: MoveObjectType,
    testnet_chain_id: String,
}

impl NameRecordHandler {
    pub fn new(testnet_chain_id: String) -> Self {
        // Indexing dynamic field object Field<[mvr_core]::name::Name, [mvr_core]::app_record::AppRecord>
        let struct_tag = Field::<MoveName, AppRecord>::struct_type();
        let type_ = MoveObjectType::from(convert_struct_tag(struct_tag));
        NameRecordHandler {
            type_,
            testnet_chain_id,
        }
    }
}
#[async_trait]
impl Handler for NameRecordHandler {
    async fn commit(values: &[Self::Value], conn: &mut Connection<'_>) -> anyhow::Result<usize> {
        use mvr_schema::schema::name_records::columns::*;
        use mvr_schema::schema::name_records::dsl::name_records;
        Ok(diesel::insert_into(name_records)
            .values(values)
            .on_conflict(name)
            .do_update()
            .set((
                mainnet_id.eq(excluded(mainnet_id)),
                testnet_id.eq(excluded(testnet_id)),
                metadata.eq(excluded(metadata)),
            ))
            .filter(object_version.lt(excluded(object_version)))
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
                    // TODO: do we need to check if the parent of the DF table entry is the MVR registry?
                    if matches!(o.type_(), Some(t) if t == &self.type_) {
                        if let Some(move_obj) = o.data.try_as_move() {
                            let data: Field<MoveName, AppRecord> =
                                bcs::from_bytes(move_obj.contents())?;
                            let MoveName { org, app } = data.name;
                            let name = Name::new(Domain { labels: org.labels }, app);
                            let AppRecord {
                                app_info,
                                networks,
                                metadata,
                                ..
                            } = data.value;

                            let networks: HashMap<_, _> = networks.into();
                            let metadata: HashMap<_, _> = metadata.into();

                            result.push(NameRecord {
                                name: name.to_string(),
                                object_version: o.version().value() as i64,
                                mainnet_id: app_info
                                    .and_then(|info| Some(info.package_info_id?.to_string())),
                                testnet_id: networks
                                    .get(&self.testnet_chain_id)
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
