//! Demo server for the MVR attestation integration (see ATTESTATION-INTEGRATION.md).
//!
//! Spins up an ephemeral Postgres (`TempDb`), seeds it so the localnet-published
//! demo subjects resolve by MVR name, and runs the real mvr-api `run_server`
//! against it. Reads the published package ids from the attestation-registry
//! repo's `demo-ids.json` (produced by its `scripts/run-demo.sh`).
//!
//! This mirrors the seeding pattern in `tests/mvr_test_cluster.rs`
//! (`setup_dummy_data`): mvr-api resolution is a pure Postgres read, so we
//! insert `packages` / `package_infos` / `name_records` rows directly rather
//! than running the indexer. Neither resolution loader reads `move_package`
//! or filters by `chain_id`, so empty/placeholder values suffice there.
//!
//! Run (from the mvr repo), with a localnet up and the demo already run:
//!   cargo run -p mvr-api --example demo_server -- \
//!       --demo-ids ~/Mysten/sui-attestation-registry/demo-ids.json --port 8000
//!
//! Then point the MVR frontend's mainnet `mvrEndpoint` at http://localhost:8000.

use std::{net::SocketAddr, path::PathBuf, str::FromStr};

use chrono::NaiveDateTime;
use clap::Parser;
use diesel::insert_into;
use diesel_async::RunQueryDsl;
use mvr_api::{run_server, Network};
use mvr_schema::{
    models::{NameRecord, Package, PackageDependency, PackageInfo},
    schema::{name_records, package_dependencies, package_infos, packages},
    MIGRATIONS,
};
use serde_json::json;
use sui_pg_db::{temp::TempDb, Db, DbArgs};
use tokio_util::sync::CancellationToken;

// Synthetic PackageInfo object ids for the seeded names. On a real network
// these would be MVR PackageInfo objects; the demo subjects have none, and
// resolution only uses these as join keys, so any distinct addresses work.
const PKG_INFO_SUBJECT: &str =
    "0x00000000000000000000000000000000000000000000000000000000dee00001";
const PKG_INFO_DEPENDENCY: &str =
    "0x00000000000000000000000000000000000000000000000000000000dee00002";

#[derive(Parser)]
struct Args {
    /// Path to the attestation-registry `demo-ids.json`.
    #[clap(long, env = "DEMO_IDS")]
    demo_ids: PathBuf,
    /// Port for the mvr-api server.
    #[clap(long, default_value_t = 8000)]
    port: u16,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    let ids: serde_json::Value = serde_json::from_slice(&std::fs::read(&args.demo_ids)?)?;
    let subject = field(&ids, "subject");
    let dependency = field(&ids, "dependency");

    // Ephemeral Postgres, alive for the lifetime of this process.
    let temp_db = TempDb::new()?;
    let url = temp_db.database().url().clone();

    let mut db = Db::for_write(url.clone(), DbArgs::default()).await?;
    db.run_migrations(Some(&MIGRATIONS)).await?;

    seed(
        &mut db,
        "@demo/subject",
        &subject,
        PKG_INFO_SUBJECT,
        "The example subject package browsed in the MVR attestation demo.",
    )
    .await?;
    seed(
        &mut db,
        "@demo/dependency",
        &dependency,
        PKG_INFO_DEPENDENCY,
        "A dependency of @demo/subject.",
    )
    .await?;

    // The real `subject -> dependency` edge, so the dependencies endpoint
    // returns it (powering both the Dependencies tab and vuln propagation).
    {
        let mut conn = db.connect().await?;
        insert_into(package_dependencies::table)
            .values(vec![PackageDependency {
                package_id: subject.clone(),
                dependency_package_id: dependency.clone(),
                chain_id: "localnet".to_string(),
                immediate_dependency: true,
            }])
            .execute(&mut *conn)
            .await?;
    }

    println!("seeded @demo/subject     -> {subject}");
    println!("seeded @demo/dependency  -> {dependency}");
    println!("seeded dependency edge   {subject} -> {dependency}");
    println!("point the frontend's mainnet mvrEndpoint at http://127.0.0.1:{}", args.port);

    run_server(
        url,
        DbArgs::default(),
        Network::Mainnet,
        args.port,
        CancellationToken::new(),
        SocketAddr::from_str("0.0.0.0:9184")?,
    )
    .await
}

/// Read `subjects.<key>` from demo-ids.json, or panic with a clear message.
fn field(ids: &serde_json::Value, key: &str) -> String {
    ids["subjects"][key]
        .as_str()
        .unwrap_or_else(|| panic!("demo-ids.json missing subjects.{key}"))
        .to_string()
}

/// Insert the `packages` / `package_infos` / `name_records` rows that make
/// `name` resolve to `package_id` (version 1, not upgraded) on mainnet.
async fn seed(
    db: &mut Db,
    name: &str,
    package_id: &str,
    pkg_info_id: &str,
    description: &str,
) -> anyhow::Result<()> {
    let package = Package {
        package_id: package_id.to_string(),
        original_id: package_id.to_string(),
        package_version: 1,
        move_package: vec![],
        chain_id: "localnet".to_string(),
        tx_hash: String::new(),
        sender: String::new(),
        timestamp: NaiveDateTime::MAX,
        deps: vec![],
    };
    let package_info = PackageInfo {
        id: pkg_info_id.to_string(),
        object_version: 0,
        package_id: package_id.to_string(),
        git_table_id: String::new(),
        chain_id: "localnet".to_string(),
        default_name: Some(name.to_string()),
        metadata: serde_json::Value::Null,
    };
    let name_record = NameRecord {
        name: name.to_string(),
        object_version: 0,
        mainnet_id: Some(pkg_info_id.to_string()),
        testnet_id: None,
        metadata: json!({ "description": description }),
    };

    let mut conn = db.connect().await?;
    insert_into(packages::table).values(vec![package]).execute(&mut *conn).await?;
    insert_into(package_infos::table).values(vec![package_info]).execute(&mut *conn).await?;
    insert_into(name_records::table).values(vec![name_record]).execute(&mut *conn).await?;
    Ok(())
}
