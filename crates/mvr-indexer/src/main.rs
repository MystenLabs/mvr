use crate::handlers::git_info_handler::{GitInfoHandler, MainnetGitInfo, TestnetGitInfo};
use crate::handlers::name_record_handler::NameRecordHandler;
use crate::handlers::package_handler::PackageHandler;
use crate::handlers::package_info_handler::PackageInfoHandler;
use crate::models::{mainnet, testnet};
use anyhow::Context;
use clap::Parser;
use futures::future::join_all;
use prometheus::Registry;
use std::net::SocketAddr;
use sui_indexer_alt_framework::ingestion::ClientArgs;
use sui_indexer_alt_framework::pipeline::concurrent::ConcurrentConfig;
use sui_indexer_alt_framework::Indexer;
use sui_indexer_alt_metrics::{MetricsArgs, MetricsService};
use sui_pg_db::DbArgs;
use tokio_util::sync::CancellationToken;
use url::Url;

pub(crate) mod handlers;

pub(crate) mod models;

#[derive(Parser)]
#[clap(rename_all = "kebab-case", author, version)]
struct Args {
    #[command(flatten)]
    db_args: DbArgs,
    #[clap(env, long, default_value = "0.0.0.0:9184")]
    metrics_address: SocketAddr,
    #[clap(env, long, default_value = "0.0.0.0:9185")]
    testnet_metrics_address: SocketAddr,
    #[clap(env, long, default_value = "https://checkpoints.mainnet.sui.io")]
    remote_store_url: Url,
    #[clap(env, long, default_value = "https://checkpoints.testnet.sui.io")]
    testnet_remote_store_url: Url,
    #[clap(env, long, default_value = "35834a8a")]
    mainnet_chain_id: String,
    #[clap(env, long, default_value = "4c78adac")]
    testnet_chain_id: String,
    #[clap(env, long)]
    disable_mainnet: bool,
    #[clap(env, long)]
    disable_testnet: bool,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let _guard = telemetry_subscribers::TelemetryConfig::new()
        .with_env()
        .init();

    let Args {
        db_args,
        metrics_address, testnet_metrics_address, remote_store_url,
        testnet_remote_store_url,
        mainnet_chain_id,
        testnet_chain_id,
        disable_mainnet,
        disable_testnet,
    } = Args::parse();

    let cancel = CancellationToken::new();

    let mut indexer_handles = vec![];
    let mut metrics_handles = vec![];

    if !disable_mainnet {
        let registry = Registry::new_custom(Some("mvr_indexer_mainnet".into()), None)
            .context("Failed to create Prometheus registry.")?;
        let metrics = MetricsService::new(MetricsArgs { metrics_address }, registry, cancel.child_token());
        let mainnet_indexer = create_mainnet_indexer(
            db_args.clone(),
            remote_store_url,
            metrics.registry(),
            mainnet_chain_id,
            testnet_chain_id.clone(),
            cancel.clone(),
        )
            .await?;
        indexer_handles.push(mainnet_indexer.run().await?);
        metrics_handles.push(metrics.run().await?)
    }

    if !disable_testnet {
        let registry = Registry::new_custom(Some("mvr_indexer_testnet".into()), None)
            .context("Failed to create Prometheus registry.")?;
        let metrics = MetricsService::new(MetricsArgs { metrics_address: testnet_metrics_address }, registry, cancel.child_token());
        let testnet_indexer = create_testnet_indexer(
            db_args,
            testnet_remote_store_url,
            metrics.registry(),
            testnet_chain_id,
            cancel.clone(),
        )
            .await?;
        indexer_handles.push(testnet_indexer.run().await?);
        metrics_handles.push(metrics.run().await?)
    }
    let _ = join_all(indexer_handles).await;
    cancel.cancel();
    let _ = join_all(metrics_handles).await;
    Ok(())
}

async fn create_mainnet_indexer(
    db_args: DbArgs,
    remote_store_url: Url,
    registry: &Registry,
    mainnet_chain_id: String,
    testnet_chain_id: String,
    cancel: CancellationToken,
) -> Result<Indexer, anyhow::Error> {
    let mut indexer = Indexer::new(
        db_args,
        Default::default(),
        ClientArgs {
            remote_store_url: Some(remote_store_url),
            local_ingestion_path: None,
        },
        Default::default(),
        None,
        registry,
        cancel.clone(),
    )
        .await?;

    indexer
        .concurrent_pipeline(
            PackageHandler::<true>::new(mainnet_chain_id.clone()),
            Default::default(),
        )
        .await?;

    indexer
        .concurrent_pipeline(
            GitInfoHandler::<MainnetGitInfo>::new(mainnet_chain_id.clone()),
            Default::default(),
        )
        .await?;

    indexer
        .concurrent_pipeline(
            PackageInfoHandler::<mainnet::mvr_metadata::package_info::PackageInfo>::new(
                mainnet_chain_id,
            ),
            Default::default(),
        )
        .await?;

    indexer
        .concurrent_pipeline(
            NameRecordHandler::new(testnet_chain_id),
            ConcurrentConfig::default(),
        )
        .await?;

    Ok(indexer)
}

async fn create_testnet_indexer(
    db_args: DbArgs,
    testnet_remote_store_url: Url,
    registry: &Registry,
    testnet_chain_id: String,
    cancel: CancellationToken,
) -> Result<Indexer, anyhow::Error> {
    let mut indexer = Indexer::new(
        db_args,
        Default::default(),
        ClientArgs {
            remote_store_url: Some(testnet_remote_store_url),
            local_ingestion_path: None,
        },
        Default::default(),
        None,
        registry,
        cancel.clone(),
    )
        .await?;

    indexer
        .concurrent_pipeline(
            PackageHandler::<false>::new(testnet_chain_id.clone()),
            Default::default(),
        )
        .await?;

    indexer
        .concurrent_pipeline(
            GitInfoHandler::<TestnetGitInfo>::new(testnet_chain_id.clone()),
            Default::default(),
        )
        .await?;

    indexer
        .concurrent_pipeline(
            PackageInfoHandler::<testnet::mvr_metadata::package_info::PackageInfo>::new(
                testnet_chain_id,
            ),
            Default::default(),
        )
        .await?;
    Ok(indexer)
}
