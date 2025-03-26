#![cfg(test)]
#![allow(dead_code)]

use std::{net::SocketAddr, path::PathBuf, str::FromStr};

use chrono::NaiveDateTime;
use diesel::insert_into;
use diesel_async::RunQueryDsl;
use move_binary_format::CompiledModule;
use mvr_api::run_server;
use mvr_schema::{
    models::{NameRecord, Package, PackageInfo},
    schema::{name_records, package_infos, packages},
    MIGRATIONS,
};
use reqwest::Client;
use serde_json::json;
use sui_move_build::{BuildConfig, CompiledPackage};
use sui_pg_db::{temp::TempDb, Db, DbArgs};
use sui_types::{
    base_types::ObjectID, move_package::MovePackage, supported_protocol_versions::ProtocolConfig,
};
use tokio::{net::TcpListener, task::JoinHandle};
use tokio_util::sync::CancellationToken;
use url::Url;

pub(crate) struct MvrTestCluster {
    pub cancellation_token: CancellationToken,
    pub db: TempDb,
    pub client: Client,
    pub server_handle: JoinHandle<()>,
    pub server_url: Url,
}

impl MvrTestCluster {
    pub async fn db_for_write(&self) -> Result<Db, anyhow::Error> {
        Db::for_write(self.db.database().url().clone(), DbArgs::default()).await
    }

    async fn migrate(&self) -> Result<(), anyhow::Error> {
        let db = self.db_for_write().await?;
        db.run_migrations(MIGRATIONS).await?;
        Ok(())
    }

    pub async fn setup_dummy_data(&self) -> Result<(), anyhow::Error> {
        let db = self.db_for_write().await?;
        setup_dummy_data(&db).await?;
        Ok(())
    }

    pub async fn new(port: Option<u16>) -> Result<Self, anyhow::Error> {
        let test_cluster = setup(port).await?;

        test_cluster.migrate().await?;
        Ok(test_cluster)
    }

    pub async fn bulk_resolution(
        &self,
        names: &[&str],
    ) -> Result<serde_json::Value, anyhow::Error> {
        let res = self
            .client
            .post(format!("{}v1/resolution/bulk", self.server_url.as_str()).parse::<Url>()?)
            .json(&json!({
                "names": names
            }))
            .send()
            .await?;

        let res_body = res.json::<serde_json::Value>().await?["resolution"].clone();

        Ok(res_body)
    }

    pub async fn bulk_reverse_resolution(
        &self,
        package_ids: &[&str],
    ) -> Result<serde_json::Value, anyhow::Error> {
        let res = self
            .client
            .post(format!("{}v1/reverse-resolution/bulk", self.server_url.as_str()).parse::<Url>()?)
            .json(&json!({
                "package_ids": package_ids
            }))
            .send()
            .await?;

        let res_body = res.json::<serde_json::Value>().await?["resolution"].clone();

        Ok(res_body)
    }

    pub async fn bulk_type_resolution(
        &self,
        types: &[&str],
    ) -> Result<serde_json::Value, anyhow::Error> {
        let res = self
            .client
            .post(format!("{}v1/type-resolution/bulk", self.server_url.as_str()).parse::<Url>()?)
            .json(&json!({
                "types": types
            }))
            .send()
            .await?;

        let res_body = res.json::<serde_json::Value>().await?["resolution"].clone();

        Ok(res_body)
    }

    pub async fn bulk_struct_definition(
        &self,
        struct_names: &[&str],
    ) -> Result<serde_json::Value, anyhow::Error> {
        let res = self
            .client
            .post(format!("{}v1/struct-definition/bulk", self.server_url.as_str()).parse::<Url>()?)
            .json(&json!({
                "types": struct_names
            }))
            .send()
            .await?;

        let res_body = res.json::<serde_json::Value>().await?["resolution"].clone();

        Ok(res_body)
    }

    pub fn teardown(&self) {
        self.server_handle.abort();
        self.cancellation_token.cancel();
    }
}

// This is the setup for our testing
// 1. It
async fn setup(port: Option<u16>) -> Result<MvrTestCluster, anyhow::Error> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to find available port");

    let assigned_port = port.unwrap_or(listener.local_addr().unwrap().port());

    let temp_db = TempDb::new()?;
    let url = temp_db.database().url();
    let url_clone = url.clone();

    let cancellation_token = CancellationToken::new();
    let server_cancellation_token = cancellation_token.clone();

    let server_handle = tokio::spawn(async move {
        let _ = run_server(
            url_clone,
            DbArgs::default(),
            mvr_api::Network::Mainnet,
            assigned_port,
            server_cancellation_token,
            SocketAddr::from_str("0.0.0.0:9184").unwrap(),
        )
        .await;
    });

    let client = Client::new();

    // Migrate initial set of data that can be used for testing multiple queries.
    Ok(MvrTestCluster {
        cancellation_token,
        db: temp_db,
        client,
        server_handle,
        server_url: format!("http://127.0.0.1:{}", assigned_port).parse()?,
    })
}

async fn setup_dummy_data(db: &Db) -> Result<(), anyhow::Error> {
    let c_pkg = MovePackage::new_initial(&build_test_modules("Cv1"), u64::MAX, 7, []).unwrap();
    let c_new = c_pkg
        .new_upgraded(
            ObjectID::from_single_byte(0xc2),
            &build_test_modules("Cv2"),
            &ProtocolConfig::get_for_max_version_UNSAFE(),
            [],
        )
        .unwrap();

    let pkg_v1 = Package {
        package_id: c_pkg.id().to_canonical_string(true),
        original_id: c_pkg.id().to_canonical_string(true),
        package_version: 1,
        move_package: bcs::to_bytes(&c_pkg).unwrap(),
        chain_id: "35834a8a".to_string(),
        tx_hash: "".to_string(),
        sender: "".to_string(),
        timestamp: NaiveDateTime::MAX,
        deps: vec![],
    };

    let pkg_v2 = Package {
        package_id: c_new.id().to_canonical_string(true),
        original_id: c_pkg.id().to_canonical_string(true),
        package_version: 2,
        move_package: bcs::to_bytes(&c_new).unwrap(),
        chain_id: "35834a8a".to_string(),
        tx_hash: "".to_string(),
        sender: "".to_string(),
        timestamp: NaiveDateTime::MAX,
        deps: vec![],
    };

    let mut connection = db.connect().await?;

    insert_into(packages::table)
        .values(vec![pkg_v1, pkg_v2])
        .execute(&mut *connection)
        .await?;

    let c_pkg_info_id = ObjectID::from_str("0x2").unwrap().to_canonical_string(true);

    let pkg_info = PackageInfo {
        id: c_pkg_info_id.clone(),
        object_version: 0,
        git_table_id: "".to_string(),
        default_name: Some("@test/core".to_string()),
        chain_id: "35834a8a".to_string(),
        metadata: serde_json::Value::Null,
        package_id: c_pkg.id().to_canonical_string(true),
    };

    // Now create the equivalent `name_record` entries.
    let name_record = NameRecord {
        name: "@test/core".to_string(),
        object_version: 0,
        // use v2 for the mainnet_id
        mainnet_id: Some(c_pkg_info_id),
        testnet_id: None,
        metadata: serde_json::Value::Null,
    };

    insert_into(name_records::table)
        .values(vec![name_record])
        .execute(&mut *connection)
        .await?;

    insert_into(package_infos::table)
        .values(vec![pkg_info])
        .execute(&mut *connection)
        .await?;

    Ok(())
}

pub fn build_test_package(test_dir: &str) -> CompiledPackage {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.extend(["tests", "packages", test_dir]);
    BuildConfig::new_for_testing().build(&path).unwrap()
}

pub fn build_test_modules(test_dir: &str) -> Vec<CompiledModule> {
    build_test_package(test_dir)
        .get_modules()
        .cloned()
        .collect()
}
