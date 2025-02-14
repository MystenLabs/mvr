// @generated automatically by Diesel CLI.

diesel::table! {
    git_infos (table_id, version) {
        table_id -> Varchar,
        version -> Int4,
        repository -> Nullable<Varchar>,
        path -> Nullable<Varchar>,
        tag -> Nullable<Varchar>,
    }
}

diesel::table! {
    name_records (name) {
        name -> Varchar,
        mainnet_id -> Nullable<Varchar>,
        testnet_id -> Nullable<Varchar>,
        metadata -> Jsonb,
    }
}

diesel::table! {
    package_infos (id) {
        id -> Varchar,
        package_id -> Varchar,
        git_table_id -> Varchar,
        default_name -> Nullable<Varchar>,
        metadata -> Jsonb,
    }
}

diesel::table! {
    packages (package_id, original_id, package_version) {
        package_id -> Varchar,
        original_id -> Varchar,
        package_version -> Int8,
        move_package -> Bytea,
    }
}

diesel::allow_tables_to_appear_in_same_query!(git_infos, name_records, package_infos, packages,);
