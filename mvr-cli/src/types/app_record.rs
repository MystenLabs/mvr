use sui_client::DynamicFieldOutput;
use sui_types::types::Address;
use sui_types::types::ObjectId;
use sui_types::types::TypeTag;

use anyhow::Result;
use serde::Deserialize;
use serde::Serialize;

use std::collections::BTreeMap;
use std::str::FromStr;

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct AppInfo {
    pub package_info_id: Option<ObjectId>,
    pub package_address: Option<Address>,
    pub upgrade_cap_id: Option<ObjectId>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct AppRecord {
    pub app_cap_id: ObjectId,
    pub ns_nft_id: ObjectId,
    pub app_info: Option<AppInfo>,
    pub networks: BTreeMap<String, AppInfo>,
    pub metadata: BTreeMap<String, String>,
    pub storage: Address,
}

impl TryFrom<&DynamicFieldOutput> for AppRecord {
    type Error = anyhow::Error;

    fn try_from(df: &DynamicFieldOutput) -> Result<Self> {
        let app_record_typetag = TypeTag::from_str(
        "0xdc7979da429684890fdff92ff48ec566f4b192c8fb7bcf12ab68e9ed7d4eb5e0::app_record::AppRecord",
        )?;
        df.deserialize_value(&app_record_typetag)
    }
}
