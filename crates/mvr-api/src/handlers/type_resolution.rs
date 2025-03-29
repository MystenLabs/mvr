use std::{collections::HashMap, str::FromStr, sync::Arc};

use futures::future::try_join_all;

use axum::{
    extract::{Path, State},
    Json,
};
use mvr_types::{name::VersionedName, named_type::NamedType};
use serde::{Deserialize, Serialize};
use sui_sdk_types::ObjectId;
use sui_types::TypeTag;

use crate::{
    data::resolution_loader::{ResolutionData, ResolutionKey},
    errors::ApiError,
    AppState,
};

use super::into_object_id_map;

#[derive(Serialize, Deserialize, Debug)]
pub struct BulkRequest {
    types: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Response {
    type_tag: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BulkResponse {
    resolution: HashMap<String, Response>,
}

pub struct TypeResolution;

impl TypeResolution {
    pub async fn resolve(
        Path(type_name): Path<String>,
        State(state): State<Arc<AppState>>,
    ) -> Result<Json<Response>, ApiError> {
        let tags = bulk_resolve_types_impl(state, vec![type_name.clone()]).await?;

        let tag = tags
            .get(&type_name)
            .ok_or(ApiError::BadRequest(format!("type not found: {type_name}")))?
            .clone()
            .ok_or(ApiError::BadRequest(format!("type not found: {type_name}")))?;

        Ok(Json(Response {
            type_tag: Some(tag.to_canonical_string(true)),
        }))
    }

    pub async fn bulk_resolve(
        State(state): State<Arc<AppState>>,
        Json(payload): Json<BulkRequest>,
    ) -> Result<Json<BulkResponse>, ApiError> {
        let tags = bulk_resolve_types_impl(state, payload.types).await?;

        Ok(Json(BulkResponse {
            resolution: tags
                .into_iter()
                .map(|(k, v)| {
                    (
                        k,
                        Response {
                            type_tag: v.map(|t| t.to_canonical_string(true)),
                        },
                    )
                })
                .collect(),
        }))
    }
}

// TODO: Double check this makes sense when testing!
// Another TODO: Consider making sure that this cannot throw errors (apart from network/db ones)
// on the bulk operations?
async fn bulk_resolve_types_impl(
    state: Arc<AppState>,
    types: Vec<String>,
) -> Result<HashMap<String, Option<TypeTag>>, ApiError> {
    let names = types
        .iter()
        .map(|type_name| NamedType::parse_names(type_name))
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .flatten()
        .map(|name| {
            let versioned_name = VersionedName::from_str(&name)?;
            Ok(ResolutionKey(versioned_name))
        })
        .collect::<Result<Vec<_>, ApiError>>()?;

    let parsed_name_addresses = state
        .loader()
        .load_many(names.clone())
        .await?
        .into_iter()
        .map(|(k, v)| (k.0.to_string(), v))
        .collect::<HashMap<_, _>>();

    let mapping_ref = Arc::new(parsed_name_addresses);

    let futures = types
        .into_iter()
        .map(|type_name| resolve_type(type_name, &mapping_ref, &state));

    Ok(try_join_all(futures).await?.into_iter().collect())
}

async fn resolve_type(
    type_name: String,
    mapping: &HashMap<String, ResolutionData>,
    state: &AppState,
) -> Result<(String, Option<TypeTag>), ApiError> {
    let Ok(correct_type_tag) = NamedType::replace_names(&type_name, &into_object_id_map(mapping))
    else {
        return Ok((type_name, None));
    };

    let parsed_type_tag = TypeTag::from_str(&correct_type_tag)
        .map_err(|e| ApiError::BadRequest(format!("bad type: {e}")))?;

    // not finding the specified tag is OK for bulk operations.
    let tag = state
        .package_resolver()
        .canonical_type(parsed_type_tag)
        .await
        .ok();

    Ok((type_name, tag))
}
