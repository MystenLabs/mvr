use move_binding_derive::move_contract;

move_contract! {alias = "sui", package = "0x2"}
move_contract! {alias = "suins", package = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0", deps = [crate::models::sui]}
move_contract! {alias = "mvr_core", package = "@mvr/core", deps = [crate::models::sui, crate::models::suins, crate::models::mvr_metadata]}
move_contract! {alias = "mvr_metadata", package = "@mvr/metadata", deps = [crate::models::sui]}
