use crate::handlers::git_info_handler::GitInfoHandler;
use crate::models::{
    mainnet::GitInfoField as MainnetGitInfo, testnet::GitInfoField as TestnetGitInfo,
};

use crate::handlers::name_record_handler::NameRecordHandler;
use crate::handlers::package_handler::PackageHandler;
use crate::handlers::package_info_handler::PackageInfoHandler;
use crate::handlers::NoOpsHandler;
use anyhow::Context;
use clap::Parser;
use mvr_indexer::{
    DEVNET_FULL_NODE_REST_API_URL, MAINNET_CHAIN_ID, MAINNET_REMOTE_STORE_URL, TESTNET_CHAIN_ID,
    TESTNET_REMOTE_STORE_URL,
};
use mvr_schema::MIGRATIONS;
use prometheus::Registry;
use std::collections::HashMap;
use std::fmt::{Display, Formatter};
use std::net::SocketAddr;
use sui_indexer_alt_framework::ingestion::ClientArgs;
use sui_indexer_alt_framework::pipeline::concurrent::ConcurrentConfig;
use sui_indexer_alt_framework::{Indexer, IndexerArgs};
use sui_indexer_alt_metrics::db::DbConnectionStatsCollector;
use sui_indexer_alt_metrics::{MetricsArgs, MetricsService};
use sui_pg_db::temp::TempDb;
use sui_pg_db::{Db, DbArgs};
use sui_rpc_api::Client;
use tokio_util::sync::CancellationToken;
use tracing::info;
use url::Url;

pub(crate) mod handlers;

pub(crate) mod models;

#[derive(Parser)]
#[clap(rename_all = "kebab-case", author, version)]
struct Args {
    #[command(flatten)]
    db_args: DbArgs,
    #[command(flatten)]
    indexer_args: IndexerArgs,
    #[clap(env, long, default_value = "0.0.0.0:9184")]
    metrics_address: SocketAddr,
    #[clap(env, long, default_value_t = Default::default())]
    env: MvrEnv,
    #[clap(
        env,
        long,
        default_value = "postgres://postgres:postgrespw@localhost:5432/mvr"
    )]
    database_url: Url,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let _guard = telemetry_subscribers::TelemetryConfig::new()
        .with_env()
        .init();

    let Args {
        db_args,
        indexer_args,
        metrics_address,
        env,
        database_url,
    } = Args::parse();

    let cancel = CancellationToken::new();
    let registry = Registry::new_custom(
        Some("mvr".into()),
        Some(HashMap::from([("mvr_env".to_string(), env.to_string())])),
    )
    .context("Failed to create Prometheus registry.")?;
    let metrics = MetricsService::new(
        MetricsArgs { metrics_address },
        registry.clone(),
        cancel.child_token(),
    );

    let (mut indexer, _temp_db) = if matches!(env, MvrEnv::CI) {
        let latest_cp = Client::new(env.remote_store_url().to_string())?
            .get_latest_checkpoint()
            .await?;
        info!("Starting from checkpoint : {}", latest_cp.sequence_number);

        let temp_db = TempDb::new()?;

        // Prepare the store for the indexer
        let store = Db::for_write(temp_db.database().url().clone(), db_args)
            .await
            .context("Failed to connect to database")?;

        store
            .run_migrations(None)
            .await
            .context("Failed to run pending migrations")?;

        registry.register(Box::new(DbConnectionStatsCollector::new(
            Some("mvr_indexer_db"),
            store.clone(),
        )))?;

        let indexer = Indexer::<Db>::new(
            store,
            IndexerArgs {
                first_checkpoint: Some(latest_cp.sequence_number),
                last_checkpoint: None,
                pipeline: vec![],
                skip_watermark: true,
            },
            ClientArgs {
                remote_store_url: None,
                local_ingestion_path: None,
                rpc_api_url: Some(env.remote_store_url()),
                rpc_username: None,
                rpc_password: None,
            },
            Default::default(),
            None, /* Metrics prefix */
            metrics.registry(),
            cancel.clone(),
        )
        .await?;
        (indexer, Some(temp_db))
    } else {
        // Prepare the store for the indexer
        let store = Db::for_write(database_url, db_args)
            .await
            .context("Failed to connect to database")?;

        store
            .run_migrations(Some(&MIGRATIONS))
            .await
            .context("Failed to run pending migrations")?;

        registry.register(Box::new(DbConnectionStatsCollector::new(
            Some("mvr_indexer_db"),
            store.clone(),
        )))?;

        let metrics_prefix = None;
        let indexer = Indexer::new(
            store,
            indexer_args,
            ClientArgs {
                remote_store_url: Some(env.remote_store_url()),
                local_ingestion_path: None,
                rpc_api_url: None,
                rpc_username: None,
                rpc_password: None,
            },
            Default::default(),
            metrics_prefix,
            metrics.registry(),
            cancel.clone(),
        )
        .await?;
        (indexer, None)
    };

    match env {
        MvrEnv::Mainnet => create_mainnet_pipelines(&mut indexer).await?,
        MvrEnv::Testnet => create_testnet_pipelines(&mut indexer).await?,
        MvrEnv::CI => create_ci_pipelines(&mut indexer).await?,
    };

    let h_indexer = indexer.run().await?;
    let h_metrics = metrics.run().await?;

    let _ = h_indexer.await;
    cancel.cancel();
    let _ = h_metrics.await;
    Ok(())
}

async fn create_mainnet_pipelines(indexer: &mut Indexer<Db>) -> Result<(), anyhow::Error> {
    use models::mainnet::PackageInfo;
    indexer
        .concurrent_pipeline(PackageHandler::<true>, Default::default())
        .await?;

    indexer
        .concurrent_pipeline(
            GitInfoHandler::<MainnetGitInfo>::new(MAINNET_CHAIN_ID.to_string()),
            Default::default(),
        )
        .await?;

    indexer
        .concurrent_pipeline(
            PackageInfoHandler::<PackageInfo>::new(MAINNET_CHAIN_ID.to_string()),
            Default::default(),
        )
        .await?;

    indexer
        .concurrent_pipeline(NameRecordHandler::new(), ConcurrentConfig::default())
        .await?;

    Ok(())
}

async fn create_testnet_pipelines(indexer: &mut Indexer<Db>) -> Result<(), anyhow::Error> {
    use models::testnet::PackageInfo;
    indexer
        .concurrent_pipeline(PackageHandler::<false>, Default::default())
        .await?;
    indexer
        .concurrent_pipeline(
            GitInfoHandler::<TestnetGitInfo>::new(TESTNET_CHAIN_ID.to_string()),
            Default::default(),
        )
        .await?;
    indexer
        .concurrent_pipeline(
            PackageInfoHandler::<PackageInfo>::new(TESTNET_CHAIN_ID.to_string()),
            Default::default(),
        )
        .await?;
    Ok(())
}

async fn create_ci_pipelines(indexer: &mut Indexer<Db>) -> Result<(), anyhow::Error> {
    indexer
        .concurrent_pipeline(NoOpsHandler, Default::default())
        .await?;
    Ok(())
}

#[derive(Debug, Clone, clap::ValueEnum)]
enum MvrEnv {
    Mainnet,
    Testnet,
    CI,
}

impl Default for MvrEnv {
    fn default() -> Self {
        Self::Mainnet
    }
}

impl Display for MvrEnv {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            MvrEnv::Mainnet => write!(f, "mainnet"),
            MvrEnv::Testnet => write!(f, "testnet"),
            MvrEnv::CI => write!(f, "ci"),
        }
    }
}

impl MvrEnv {
    fn remote_store_url(&self) -> Url {
        let remote_store_url = match self {
            MvrEnv::Mainnet => MAINNET_REMOTE_STORE_URL,
            MvrEnv::Testnet => TESTNET_REMOTE_STORE_URL,
            MvrEnv::CI => DEVNET_FULL_NODE_REST_API_URL,
        };
        // Safe to unwrap on verified static URLs
        Url::parse(remote_store_url).unwrap()
    }
}
