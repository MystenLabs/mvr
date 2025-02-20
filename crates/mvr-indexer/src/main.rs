use crate::handlers::git_info_handler::GitInfoHandler;
use crate::handlers::name_record_handler::NameRecordHandler;
use crate::handlers::package_handler::PackageHandler;
use crate::handlers::package_info_handler::PackageInfoHandler;
use anyhow::Context;
use clap::Parser;
use prometheus::Registry;
use sui_client::Client;
use sui_indexer_alt_framework::ingestion::{ClientArgs, IngestionConfig};
use sui_indexer_alt_framework::pipeline::concurrent::ConcurrentConfig;
use sui_indexer_alt_framework::{Indexer, IndexerArgs};
use sui_pg_db::DbArgs;
use tokio_util::sync::CancellationToken;
use url::Url;

pub(crate) mod handlers;

pub(crate) mod models;

#[derive(Parser)]
#[clap(rename_all = "kebab-case", author, version)]
struct Args {
    #[command(flatten)]
    indexer_args: IndexerArgs,
    #[command(flatten)]
    db_args: DbArgs,
    #[command(flatten)]
    client_args: ClientArgs,
    #[clap(env, long, default_value = "https://mvr-rpc.sui-mainnet.mystenlabs.com/")]
    mainnet_gql_url: Url,
    #[clap(env, long, default_value = "https://mvr-rpc.sui-testnet.mystenlabs.com/")]
    testnet_gql_url: Url,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let _guard = telemetry_subscribers::TelemetryConfig::new()
        .with_env()
        .init();

    let Args {
        indexer_args,
        db_args,
        client_args,
        mainnet_gql_url,
        testnet_gql_url,
    } = Args::parse();

    let mainnet_client = Client::new(mainnet_gql_url.as_str())?;
    let mainnet_chain_id = mainnet_client.chain_id().await?;

    let testnet_client = Client::new(testnet_gql_url.as_str())?;
    let testnet_chain_id = testnet_client.chain_id().await?;

    let registry = Registry::new_custom(Some("mvr_indexer".into()), None)
        .context("Failed to create Prometheus registry.")?;

    let cancel = CancellationToken::new();
    let mut indexer = Indexer::new(
        db_args,
        indexer_args,
        client_args,
        IngestionConfig::default(),
        None,
        &registry,
        cancel.clone(),
    )
        .await?;

    indexer
        .concurrent_pipeline(PackageHandler::new(mainnet_chain_id), ConcurrentConfig::default())
        .await?;

    indexer
        .concurrent_pipeline(GitInfoHandler::new(), ConcurrentConfig::default())
        .await?;

    indexer
        .concurrent_pipeline(PackageInfoHandler, ConcurrentConfig::default())
        .await?;

    indexer
        .concurrent_pipeline(
            NameRecordHandler::new(testnet_chain_id),
            ConcurrentConfig::default(),
        )
        .await?;

    let h_indexer = indexer.run().await?;
    let _ = h_indexer.await;
    cancel.cancel();

    Ok(())
}
