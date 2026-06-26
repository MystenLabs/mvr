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
//!       --demo-ids <attestation-registry>/demo-ids.json --port 8000
//!
//! Then point the MVR frontend's mainnet `mvrEndpoint` at http://localhost:8000.

use std::{net::SocketAddr, path::PathBuf, str::FromStr};

use chrono::NaiveDateTime;
use clap::Parser;
use diesel::insert_into;
use diesel_async::RunQueryDsl;
use mvr_api::{run_server, Network};
use mvr_schema::{
    models::{GitInfo, NameRecord, Package, PackageDependency, PackageInfo},
    schema::{git_infos, name_records, package_dependencies, package_infos, packages},
    MIGRATIONS,
};

// Where the demo package READMEs live, for MVR's git-backed README fetch. We
// point at the PR branch (not a tag) so the READMEs always track the deployed
// demo sources; a pinned tag goes stale whenever the demo is restructured.
const DEMO_REPO_URL: &str = "https://github.com/mdgeorge4153/sui-attestation-registry";
const DEMO_GIT_REF: &str = "mdgeorge/attest-positive";
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
    // The dependency is published in two versions (demo of the per-version
    // attestation selector); seed all of them under one MVR name.
    let dependency_versions = dependency_versions(&ids);

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
        None,
    )
    .await?;
    seed_versions(
        &mut db,
        "@demo/dependency",
        &dependency_versions,
        PKG_INFO_DEPENDENCY,
        "A dependency of @demo/subject.",
        Some("demo/dependency_example"),
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

    // Give each trusted attester package an MVR name, so the UI can link to
    // its page. Names are kept in sync with scripts/write-demo-env.sh.
    if let Some(attestors) = ids["trustedAttestors"].as_array() {
        for (i, a) in attestors.iter().enumerate() {
            let pkg_name = a["name"].as_str().unwrap_or_default();
            let latest = a["latestId"].as_str().unwrap_or_default().to_string();
            let mvr_name = auditor_mvr_name(pkg_name);
            let pkg_info_id = format!("0x{:064x}", 0xdee0_0010u64 + i as u64);
            let git_path = format!("demo/{pkg_name}");
            seed(
                &mut db,
                &mvr_name,
                &latest,
                &pkg_info_id,
                "A trusted attester in the demo.",
                Some(&git_path),
            )
            .await?;
            println!("seeded {mvr_name}  -> {latest}");
        }
    }

    // Untrusted attesters get a name too, so their pages are browsable — the UI
    // should hide the Issued tab for them (they're not in the trust config).
    if let Some(attestors) = ids["untrustedAttestors"].as_array() {
        for (i, a) in attestors.iter().enumerate() {
            let pkg_name = a["name"].as_str().unwrap_or_default();
            let id = a["id"].as_str().unwrap_or_default().to_string();
            let mvr_name = auditor_mvr_name(pkg_name);
            let pkg_info_id = format!("0x{:064x}", 0xdee0_0020u64 + i as u64);
            let git_path = format!("demo/{pkg_name}");
            seed(
                &mut db,
                &mvr_name,
                &id,
                &pkg_info_id,
                "An untrusted attester in the demo.",
                Some(&git_path),
            )
            .await?;
            println!("seeded {mvr_name}  -> {id} (untrusted)");
        }
    }

    println!("seeded @demo/subject     -> {subject}");
    println!(
        "seeded @demo/dependency  -> {} version(s): {}",
        dependency_versions.len(),
        dependency_versions
            .iter()
            .map(|(addr, v)| format!("v{v}={addr}"))
            .collect::<Vec<_>>()
            .join(", ")
    );
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

/// MVR name for a trusted attester package (kept in sync with the frontend
/// trust config in scripts/write-demo-env.sh).
fn auditor_mvr_name(pkg_name: &str) -> String {
    match pkg_name {
        "vuln_example" => "@example-scanner/disclosures".to_string(),
        // MVR names can't contain `_`; the demo auditor package is `auditor_a`.
        other => format!("@demo/{}", other.replace('_', "-")),
    }
}

/// Read `subjects.<key>` from demo-ids.json, or panic with a clear message.
fn field(ids: &serde_json::Value, key: &str) -> String {
    ids["subjects"][key]
        .as_str()
        .unwrap_or_else(|| panic!("demo-ids.json missing subjects.{key}"))
        .to_string()
}

/// Read the top-level `dependencyVersions` array as `(package_id, version)`
/// pairs, sorted ascending by version so `[0]` is v1 (the original id).
fn dependency_versions(ids: &serde_json::Value) -> Vec<(String, i64)> {
    let mut versions: Vec<(String, i64)> = ids["dependencyVersions"]
        .as_array()
        .unwrap_or_else(|| panic!("demo-ids.json missing dependencyVersions"))
        .iter()
        .map(|v| {
            let addr = v["address"]
                .as_str()
                .expect("dependencyVersions[].address")
                .to_string();
            let version = v["version"].as_i64().expect("dependencyVersions[].version");
            (addr, version)
        })
        .collect();
    versions.sort_by_key(|(_, v)| *v);
    versions
}

/// Insert the rows that make `name` resolve to `package_id` (single version,
/// not upgraded) on mainnet.
async fn seed(
    db: &mut Db,
    name: &str,
    package_id: &str,
    pkg_info_id: &str,
    description: &str,
    git_path: Option<&str>,
) -> anyhow::Result<()> {
    seed_versions(
        db,
        name,
        &[(package_id.to_string(), 1)],
        pkg_info_id,
        description,
        git_path,
    )
    .await
}

/// Insert the `packages` / `package_infos` / `name_records` rows for a package
/// published in one or more versions. `versions` is `(package_id, version)`
/// sorted ascending; `[0]` is the original (v1). mvr resolution models an
/// upgraded package as multiple `packages` rows sharing one `original_id`, so
/// we seed one row per version (all under that original) plus a single
/// `package_info`/`name_record`/`git_info` — then `@name/N` resolves to the row
/// whose `package_version == N`, and bare `@name` to the latest.
async fn seed_versions(
    db: &mut Db,
    name: &str,
    versions: &[(String, i64)],
    pkg_info_id: &str,
    description: &str,
    git_path: Option<&str>,
) -> anyhow::Result<()> {
    let original_id = &versions[0].0;
    let packages: Vec<Package> = versions
        .iter()
        .map(|(package_id, version)| Package {
            package_id: package_id.to_string(),
            original_id: original_id.to_string(),
            package_version: *version,
            move_package: vec![],
            chain_id: "localnet".to_string(),
            tx_hash: String::new(),
            sender: String::new(),
            timestamp: NaiveDateTime::MAX,
            deps: vec![],
        })
        .collect();
    let package_info = PackageInfo {
        id: pkg_info_id.to_string(),
        object_version: 0,
        package_id: original_id.to_string(),
        git_table_id: if git_path.is_some() {
            pkg_info_id.to_string()
        } else {
            String::new()
        },
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
    insert_into(packages::table).values(packages).execute(&mut *conn).await?;
    insert_into(package_infos::table).values(vec![package_info]).execute(&mut *conn).await?;
    insert_into(name_records::table).values(vec![name_record]).execute(&mut *conn).await?;
    if let Some(path) = git_path {
        // git_table_id == pkg_info_id (set above); join key for the README.
        insert_into(git_infos::table)
            .values(vec![GitInfo {
                table_id: pkg_info_id.to_string(),
                object_version: 0,
                version: 1,
                chain_id: "localnet".to_string(),
                repository: Some(DEMO_REPO_URL.to_string()),
                path: Some(path.to_string()),
                tag: Some(DEMO_GIT_REF.to_string()),
            }])
            .execute(&mut *conn)
            .await?;
    }
    Ok(())
}
