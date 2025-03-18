use std::{collections::HashMap, str::FromStr, sync::Arc};

use futures::future::try_join_all;

use axum::{
    extract::{Path, State},
    Json,
};
use move_core_types::language_storage::StructTag;
use mvr_types::{name::VersionedName, named_type::NamedType};
use serde::{Deserialize, Serialize};
use sui_types::base_types::ObjectID;

use crate::{
    data::{package_resolver::PackageKey, resolution_loader::ResolutionKey},
    errors::ApiError,
    AppState,
};

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

pub struct StructDefinition;

impl StructDefinition {
    pub async fn resolve(
        Path(type_name): Path<String>,
        State(state): State<Arc<AppState>>,
    ) -> Result<Json<Response>, ApiError> {
        verify_input(&type_name)?;

        let tags = bulk_resolve_definitions_impl(state, vec![type_name.clone()]).await?;

        let tag = tags
            .get(&type_name)
            .cloned()
            .flatten()
            .ok_or(ApiError::BadRequest(format!("type not found: {type_name}")))?;

        Ok(Json(Response {
            type_tag: Some(tag),
        }))
    }

    pub async fn bulk_resolve(
        State(state): State<Arc<AppState>>,
        Json(payload): Json<BulkRequest>,
    ) -> Result<Json<BulkResponse>, ApiError> {
        for type_name in payload.types.iter() {
            verify_input(type_name)?;
        }

        let tags = bulk_resolve_definitions_impl(state, payload.types).await?;

        Ok(Json(BulkResponse {
            resolution: tags
                .into_iter()
                .map(|(k, type_tag)| (k, Response { type_tag }))
                .collect(),
        }))
    }
}

async fn bulk_resolve_definitions_impl(
    state: Arc<AppState>,
    types: Vec<String>,
) -> Result<HashMap<String, Option<String>>, ApiError> {
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
        .load_many(names)
        .await?
        .into_iter()
        .map(|(k, v)| (k.0.to_string(), v))
        .collect::<HashMap<_, _>>();

    let mapping_ref = Arc::new(parsed_name_addresses);

    let futures = types
        .into_iter()
        .map(|type_name| resolve_definition(type_name, &mapping_ref, &state));

    Ok(try_join_all(futures).await?.into_iter().collect())
}

/// Given a `type_name`, we try to resolve the definition of that TypeTag.
/// This is different from the type resolution API, which can resolve any type (primitives, generics, etc.),
/// but requires the full-type to be valid (cannot do partial generic resolution).
async fn resolve_definition(
    type_name: String,
    mapping: &HashMap<String, ObjectID>,
    state: &AppState,
) -> Result<(String, Option<String>), ApiError> {
    let Ok(correct_type_tag) = NamedType::replace_names(&type_name, mapping) else {
        return Ok((type_name, None));
    };

    // For input errors, we throw an error.
    let parsed_type_tag = StructTag::from_str(&correct_type_tag)
        .map_err(|e| ApiError::BadRequest(format!("bad type: {e}")))?;

    // For "non-existent packages", we return None, unless we had an unexpected crash,
    // in which case we return an error.
    let Some(package) = state
        .loader()
        .load_one(PackageKey(parsed_type_tag.address))
        .await
        .map_err(|e| ApiError::InternalServerError(format!("package resolver crashed: {e}")))?
    else {
        return Ok((type_name, None));
    };

    // For "non-existent modules", we return None (that's the only error case here).
    let Some(module) = package.module(parsed_type_tag.module.as_str()).ok() else {
        return Ok((type_name, None));
    };

    let Some(data_ref) = module
        .data_def(parsed_type_tag.name.as_str())
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to deserialize data def: {e}"))
        })?
    else {
        return Ok((type_name, None));
    };

    // reformat the type tag with the defining address
    let res = format!(
        "{}::{}::{}",
        data_ref.defining_id.to_canonical_string(true),
        parsed_type_tag.module.as_str(),
        parsed_type_tag.name.as_str()
    );

    Ok((type_name, Some(res)))
}

fn verify_input(type_name: &str) -> Result<(), ApiError> {
    if !type_name.contains("::") {
        return Err(ApiError::BadRequest(format!(
            "Type `{}` does not contain `::`, so it cannot be a valid struct.",
            type_name
        )));
    }

    if type_name.contains("<") {
        return Err(ApiError::BadRequest(format!(
            "Type `{}` contains generic parameters. Use the type resolution APIs instead.",
            type_name
        )));
    }

    Ok(())
}
