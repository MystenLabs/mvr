use crate::handlers::git_info_handler::GitInfoHandler;
use crate::handlers::package_handler::PackageHandler;
use crate::models::SuiEnv;
use anyhow::Context;
use clap::Parser;
use prometheus::Registry;
use sui_indexer_alt_framework::ingestion::{ClientArgs, IngestionConfig};
use sui_indexer_alt_framework::pipeline::concurrent::ConcurrentConfig;
use sui_indexer_alt_framework::{Indexer, IndexerArgs};
use sui_pg_db::DbArgs;
use sui_sdk_types::ObjectId;
use tokio_util::sync::CancellationToken;

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
    #[clap(env, long, default_value = "mainnet")]
    sui_env: SuiEnv,
    #[clap(
        env,
        long,
        default_value = "0x0bde14ccbabe5328c867e82495a4c39a3688c69943a5dc333f79029f966f0354"
    )]
    mvr_core_pkg_id: ObjectId,
    #[clap(
        env,
        long,
        default_value = "0x0f6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1"
    )]
    mvr_metadata_pkg_id: ObjectId,
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
        sui_env,
        mvr_core_pkg_id,
        mvr_metadata_pkg_id,
    } = Args::parse();

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
        .concurrent_pipeline(PackageHandler::new(sui_env), ConcurrentConfig::default())
        .await?;

    indexer
        .concurrent_pipeline(
            GitInfoHandler::new(mvr_metadata_pkg_id),
            ConcurrentConfig::default(),
        )
        .await?;

    let h_indexer = indexer.run().await?;
    let _ = h_indexer.await;
    cancel.cancel();

    Ok(())
}
