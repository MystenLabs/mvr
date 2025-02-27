pub mod git_info_handler;
pub mod name_record_handler;
pub mod package_handler;
pub mod package_info_handler;

use move_core_types::language_storage::StructTag as MoveStructTag;
use std::str::FromStr;
use sui_sdk_types::StructTag;

// Convert rust sdk struct tag to move struct tag.
pub fn convert_struct_tag(tag: StructTag) -> MoveStructTag {
    MoveStructTag::from_str(&tag.to_string()).unwrap()
}