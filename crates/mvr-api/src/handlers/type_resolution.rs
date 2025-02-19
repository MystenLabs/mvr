// use std::{collections::HashMap, str::FromStr, sync::Arc};

// use futures::future::try_join_all;

// use axum::{
//     extract::{Path, State},
//     Json,
// };
// use mvr_types::{errors::MoveRegistryError, named_type::NamedType};
// use sui_types::TypeTag;

// use crate::{errors::ApiError, AppState};

// pub struct TypeResolution;

// impl TypeResolution {
//     pub async fn resolve(
//         Path((network, type_name)): Path<(String, String)>,
//         State(state): State<Arc<AppState>>,
//     ) -> Result<Json<String>, ApiError> {
//         let tags = bulk_resolve_types_impl(state, vec![type_name.clone()], network).await?;

//         let tag = tags
//             .get(&type_name)
//             .ok_or(ApiError::BadRequest(format!("type not found: {type_name}")))?;

//         Ok(Json(tag.to_string()))
//     }

//     pub async fn bulk_resolve(
//         Path(network): Path<String>,
//         State(state): State<Arc<AppState>>,
//         Json(payload): Json<Vec<String>>,
//     ) -> Result<Json<HashMap<String, String>>, ApiError> {
//         let tags = bulk_resolve_types_impl(state, payload, network).await?;

//         Ok(Json(
//             tags.into_iter().map(|(k, v)| (k, v.to_string())).collect(),
//         ))
//     }
// }

// async fn bulk_resolve_types_impl(
//     state: Arc<AppState>,
//     types: Vec<String>,
//     network: String,
// ) -> Result<HashMap<String, TypeTag>, ApiError> {
//     let names = types
//         .iter()
//         .map(|type_name| NamedType::parse_names(type_name))
//         .collect::<Result<Vec<_>, _>>()?
//         .into_iter()
//         .flatten()
//         .collect::<Vec<_>>();

//     let parsed_name_addresses = bulk_resolve_names_impl(&state, names.clone(), network).await?;

//     // now let's create a hashmap with {name: MovePackage}
//     let mut name_package_id_mapping = HashMap::new();

//     for name in names.iter() {
//         let Some(package_id) = parsed_name_addresses.get(name) else {
//             return Err(MoveRegistryError::NameNotFound(name.clone()).into());
//         };

//         let Some(object_id) = package_id.0 else {
//             return Err(MoveRegistryError::NameNotFound(name.clone()).into());
//         };

//         name_package_id_mapping.insert(name.clone(), object_id);
//     }

//     let mapping_ref = Arc::new(name_package_id_mapping);

//     let futures = types.into_iter().map(|type_name| {
//         let state = state.clone();
//         let mapping = mapping_ref.clone();

//         async move {
//             let correct_type_tag = NamedType::replace_names(&type_name, &mapping)
//                 .map_err(|e| ApiError::BadRequest(format!("bad type: {e}")))?;

//             let parsed_type_tag = TypeTag::from_str(&correct_type_tag)
//                 .map_err(|e| ApiError::BadRequest(format!("bad type: {e}")))?;

//             let tag = state
//                 .package_resolver()
//                 .canonical_type(parsed_type_tag)
//                 .await
//                 .map_err(|e| {
//                     ApiError::InternalServerError(format!("Failed to retrieve type: {e}"))
//                 })?;

//             Ok::<(String, TypeTag), ApiError>((type_name, tag))
//         }
//     });

//     Ok(try_join_all(futures).await?.into_iter().collect())
// }
