use sui_sdk_types::StructTag;

pub trait MoveStructType {
    fn struct_type() -> StructTag;
}

pub mod mainnet {
    use std::str::FromStr;

    use serde::{Deserialize, Serialize};
    use sui_sdk_types::{Address, StructTag};
    use sui_types::{
        collection_types::{Table, VecMap},
        dynamic_field::Field,
    };

    use crate::models::MoveStructType;

    #[derive(Deserialize, Serialize, Debug)]
    pub struct PackageInfo {
        pub id: Address,
        pub display: PackageDisplay,
        pub upgrade_cap_id: Address,
        pub package_address: Address,
        pub metadata: VecMap<String, String>,
        pub git_versioning: Table,
    }

    impl MoveStructType for PackageInfo {
        fn struct_type() -> StructTag {
            StructTag::from_str("0x0f6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1::package_info::PackageInfo").expect("Failed to parse struct type")
        }
    }

    #[derive(Deserialize, Serialize, Debug)]
    pub struct AppInfo {
        pub package_info_id: Option<Address>,
        pub package_address: Option<Address>,
        pub upgrade_cap_id: Option<Address>,
    }

    #[derive(Deserialize, Serialize, Debug)]
    pub struct AppRecord {
        pub app_cap_id: Address,
        pub ns_nft_id: Address,
        pub app_info: Option<AppInfo>,
        pub networks: VecMap<String, AppInfo>,
        pub metadata: VecMap<String, String>,
        pub storage: Address,
    }

    impl MoveStructType for AppRecord {
        fn struct_type() -> StructTag {
            StructTag::from_str("0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b::app_record::AppRecord").expect("Failed to parse struct type")
        }
    }

    #[derive(Deserialize, Serialize, Debug)]
    pub struct GitInfo {
        pub repository: String,
        pub path: String,
        pub tag: String,
    }

    impl MoveStructType for GitInfo {
        fn struct_type() -> StructTag {
            StructTag::from_str(
                "0x0f6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1::git::GitInfo",
            )
            .expect("Failed to parse struct type")
        }
    }

    #[derive(Deserialize, Serialize, Debug)]
    pub struct PackageDisplay {
        pub gradient_from: String,
        pub gradient_to: String,
        pub text_color: String,
        pub name: String,
        pub uri_encoded_name: String,
    }

    pub type GitInfoField = Field<u64, GitInfo>;

    impl MoveStructType for GitInfoField {
        fn struct_type() -> StructTag {
            let git_info_tag = GitInfo::struct_type();
            StructTag::from_str(format!(
                "0x2::dynamic_field::Field<u64, {}>",
                git_info_tag.to_string()
            ).as_str())
            .expect("Failed to parse struct type that is known to be valid.")
        }
    }
}

pub mod testnet {
    use std::str::FromStr;

    use serde::{Deserialize, Serialize};
    use sui_sdk_types::{Address, StructTag};
    use sui_types::{
        collection_types::{Table, VecMap},
        dynamic_field::Field,
    };

    use crate::models::MoveStructType;

    #[derive(Deserialize, Serialize, Debug)]
    pub struct PackageDisplay {
        pub gradient_from: String,
        pub gradient_to: String,
        pub text_color: String,
        pub name: String,
        pub uri_encoded_name: String,
    }

    #[derive(Deserialize, Serialize, Debug)]
    pub struct PackageInfo {
        pub id: Address,
        pub display: PackageDisplay,
        pub upgrade_cap_id: Address,
        pub package_address: Address,
        pub metadata: VecMap<String, String>,
        pub git_versioning: Table,
    }

    impl MoveStructType for PackageInfo {
        fn struct_type() -> StructTag {
            StructTag::from_str("0xb96f44d08ae214887cae08d8ae061bbf6f0908b1bfccb710eea277f45150b9f4::package_info::PackageInfo").expect("Failed to parse struct type")
        }
    }

    #[derive(Deserialize, Serialize, Debug)]
    pub struct GitInfo {
        pub repository: String,
        pub path: String,
        pub tag: String,
    }

    impl MoveStructType for GitInfo {
        fn struct_type() -> StructTag {
            StructTag::from_str(
                "0xb96f44d08ae214887cae08d8ae061bbf6f0908b1bfccb710eea277f45150b9f4::git::GitInfo",
            )
            .expect("Failed to parse struct type")
        }
    }

    // The `Field<u64, GitInfo` that we index from the chain.
    pub type GitInfoField = Field<u64, GitInfo>;

    impl MoveStructType for GitInfoField {
        fn struct_type() -> StructTag {
            let git_info_tag = GitInfo::struct_type();
            StructTag::from_str(format!(
                "0x2::dynamic_field::Field<u64, {}>",
                git_info_tag.to_string()
            ).as_str())
            .expect("Failed to parse struct type that is known to be valid.")
        }
    }
}
