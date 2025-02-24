use std::{collections::HashMap, str::FromStr, sync::Arc};

use futures::future::try_join_all;

use axum::{
    extract::{Path, State},
    Json,
};
use mvr_types::{name::VersionedName, named_type::NamedType};
use sui_types::TypeTag;

use crate::{data::resolution_loader::ResolutionKey, errors::ApiError, AppState};

pub struct TypeResolution;

impl TypeResolution {
    pub async fn resolve(
        Path(type_name): Path<String>,
        State(state): State<Arc<AppState>>,
    ) -> Result<Json<String>, ApiError> {
        let tags = bulk_resolve_types_impl(state, vec![type_name.clone()]).await?;

        let tag = tags
            .get(&type_name)
            .ok_or(ApiError::BadRequest(format!("type not found: {type_name}")))?;

        Ok(Json(tag.to_string()))
    }

    pub async fn bulk_resolve(
        State(state): State<Arc<AppState>>,
        Json(payload): Json<Vec<String>>,
    ) -> Result<Json<HashMap<String, String>>, ApiError> {
        let tags = bulk_resolve_types_impl(state, payload).await?;

        Ok(Json(
            tags.into_iter().map(|(k, v)| (k, v.to_string())).collect(),
        ))
    }
}

// TODO: Double check this makes sense when testing!
// Another TODO: Consider making sure that this cannot throw errors (apart from network/db ones)
// on the bulk operations?
async fn bulk_resolve_types_impl(
    state: Arc<AppState>,
    types: Vec<String>,
) -> Result<HashMap<String, TypeTag>, ApiError> {
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

    let futures = types.into_iter().map(|type_name| {
        let state = state.clone();
        let mapping = mapping_ref.clone();

        async move {
            let correct_type_tag = NamedType::replace_names(&type_name, &mapping)
                .map_err(|e| ApiError::BadRequest(format!("bad type: {e}")))?;

            let parsed_type_tag = TypeTag::from_str(&correct_type_tag)
                .map_err(|e| ApiError::BadRequest(format!("bad type: {e}")))?;

            let tag = state
                .package_resolver()
                .canonical_type(parsed_type_tag)
                .await
                .map_err(|e| {
                    ApiError::InternalServerError(format!("Failed to retrieve type: {e}"))
                })?;

            Ok::<(String, TypeTag), ApiError>((type_name, tag))
        }
    });

    Ok(try_join_all(futures).await?.into_iter().collect())
}
