use crate::models::{NameRecord, Package, PackageInfo};
use crate::schema::{name_records, package_infos, packages};
use crate::AppState;
use diesel_async::RunQueryDsl;

pub async fn seed_database(state: &AppState) -> Result<(), anyhow::Error> {
    let mut connection = state.db.get().await?;

    let package_seeds = vec![
        Package {
            package_id: "0x222".to_string(),
            original_id: "0x2".to_string(),
            package_version: 3,
            move_package: vec![],
        },
        Package {
            package_id: "0x22".to_string(),
            original_id: "0x2".to_string(),
            package_version: 2,
            move_package: vec![],
        },
        Package {
            package_id: "0x2".to_string(),
            original_id: "0x2".to_string(),
            package_version: 1,
            move_package: vec![],
        },
        Package {
            package_id: "0x3".to_string(),
            original_id: "0x3".to_string(),
            package_version: 1,
            move_package: vec![],
        },
    ];

    let package_info_seeds = vec![
        PackageInfo {
            id: "0xRandomPackageInfo".to_string(),
            // registered on v2
            package_id: "0x22".to_string(),
            git_table_id: "0xRandomPackageInfoTableId".to_string(),
            default_name: Some("@test/wow".to_string()),
            metadata: serde_json::json!({}),
        },
        PackageInfo {
            id: "0xPackageInfoFor0x3".to_string(),
            // registered on v1
            package_id: "0x3".to_string(),
            git_table_id: "0xPackageInfoFor0x3TableId".to_string(),
            default_name: Some("@test/wowo".to_string()),
            metadata: serde_json::json!({}),
        },
    ];

    diesel::insert_into(package_infos::table)
        .values(&package_info_seeds)
        .execute(&mut connection)
        .await?;

    diesel::insert_into(packages::table)
        .values(&package_seeds)
        .execute(&mut connection)
        .await?;

    let name_record_seeds = vec![
        NameRecord {
            name: "@test/wow".to_string(),
            mainnet_id: Some("0xRandomPackageInfo".to_string()),
            testnet_id: None,
            metadata: serde_json::json!({}),
        },
        NameRecord {
            name: "@test/wowo".to_string(),
            mainnet_id: Some("0xPackageInfoFor0x3".to_string()),
            testnet_id: None,
            metadata: serde_json::json!({}),
        },
    ];

    diesel::insert_into(name_records::table)
        .values(&name_record_seeds)
        .execute(&mut connection)
        .await?;

    Ok(())
}
