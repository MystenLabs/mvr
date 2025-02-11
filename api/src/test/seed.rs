use crate::models::{NameRecord, Package, PackageInfo};
use crate::schema::{name_records, package_infos, packages};
use crate::AppState;
use diesel_async::RunQueryDsl;
use rand::Rng;

/// Some more predictable data, for testing.
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

/// A helper to seed the DB with reasonable amount of data (1M packages (100K pkgs, 10 versions each), 10K names)
pub async fn load_seed_data(state: &AppState) -> Result<(), anyhow::Error> {
    let mut connection = state.db.get().await?;

    let num_original_ids = 100000; // 100,000 unique packages.
    let num_versions = 10; // 10 versions per original_id
    let num_names = 10000; // 10,000 unique names

    let mut rng = rand::rng();

    // Step 1: Prepare name records (1 for each name)
    let mut name_records = Vec::with_capacity(num_names);
    for i in 1..=num_names {
        let name = format!("@test/name{}", i);
        let mainnet_id = format!("mainnet_{}", i);
        let testnet_id = format!("testnet_{}", i);
        let metadata = serde_json::json!({"created_at": "2023-02-01"});

        // Store the name record data
        name_records.push((name, mainnet_id, testnet_id, metadata));
    }

    // Prepare raw SQL query for name_records insert
    let name_values: Vec<String> = name_records
        .clone()
        .iter()
        .map(|(name, mainnet_id, testnet_id, metadata)| {
            format!(
                "('{}', '{}', '{}', '{}')",
                name,
                mainnet_id,
                testnet_id,
                serde_json::to_string(metadata).unwrap()
            )
        })
        .collect();

    // Perform the bulk insert of name records in one go
    let name_insert_query = format!(
        "INSERT INTO name_records (name, mainnet_id, testnet_id, metadata) VALUES {}",
        name_values.join(", ")
    );

    diesel::sql_query(name_insert_query)
        .execute(&mut connection)
        .await?;

    // Step 2: Prepare package_infos and packages
    // let mut package_infos = Vec::with_capacity(num_names); // 10 versions per original_id
    // let mut package_count = 0;

    // Create many package entries, to test how well we behave with a large number of packages
    // This is not the best way to do it, but it's just for testing
    let mut package_entries: Vec<String> = Vec::with_capacity(num_names * num_versions);
    for original_id_counter in 1..=num_original_ids {
        for version in 1..=num_versions {
            let package_id = if version == 1 {
                format!("0xoriginal_{}", original_id_counter)
            } else {
                format!("0xpackage{}{}", original_id_counter, version)
            };

            let original_id = format!("0xoriginal_{}", original_id_counter);
            let move_package = vec![0u8; 100];

            package_entries.push(format!(
                "('{}', '{}', '{}', '{}')",
                package_id,
                original_id,
                version,
                serde_json::to_string(&move_package).unwrap()
            ));
        }
    }

    let package_entries_query = format!(
        "INSERT INTO packages (package_id, original_id, package_version, move_package) VALUES {}",
        package_entries.join(", ")
    );

    diesel::sql_query(package_entries_query)
        .execute(&mut connection)
        .await?;

    // create package_infos, for each existing `name`

    let mut package_infos = Vec::with_capacity(num_names);

    for name in name_records {
        let package_info = PackageInfo {
            id: name.1,
            package_id: format!(
                "0xpackage{}{}",
                rng.random_range(1..=num_original_ids),
                rng.random_range(1..=num_versions)
            ),
            git_table_id: format!("git_table_{}", rng.random_range(0..100)),
            default_name: Some(name.0),
            metadata: serde_json::json!({}),
        };
        package_infos.push(package_info);
    }

    let package_infos_query = format!(
        "INSERT INTO package_infos (id, package_id, git_table_id, default_name, metadata) VALUES {}",
        package_infos.iter()
            .map(|info| format!(
                "('{}', '{}', '{}', '{}', '{}')",
                info.id,
                info.package_id,
                info.git_table_id,
                info.default_name.as_ref().map(|s| s.as_str()).unwrap_or("NULL"),
                serde_json::to_string(&info.metadata).unwrap()
            ))
            .collect::<Vec<_>>()
            .join(", ")
    );

    diesel::sql_query(package_infos_query)
        .execute(&mut connection)
        .await?;

    Ok(())
}
