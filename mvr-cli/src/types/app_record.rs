use sui_client::DynamicFieldOutput;
use sui_types::Address;
use sui_types::ObjectId;

use anyhow::Result;
use serde::Deserialize;
use serde::Serialize;

use std::collections::BTreeMap;

use crate::APP_REC_TYPETAG;

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
        df.deserialize_value(&APP_REC_TYPETAG)
            .map_err(|e| anyhow::anyhow!(e))
    }
}
