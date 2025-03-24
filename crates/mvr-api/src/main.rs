// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::net::SocketAddr;

use clap::Parser;
use mvr_api::{run_server, Network};
use sui_pg_db::DbArgs;
use tokio_util::sync::CancellationToken;
use url::Url;

#[derive(Parser)]
#[clap(rename_all = "kebab-case", author, version)]
struct Args {
    #[command(flatten)]
    db_args: DbArgs,
    #[clap(env, long, default_value = "0.0.0.0:9184")]
    metrics_address: SocketAddr,
    #[clap(long, value_enum, env)]
    network: Network,
    #[clap(long, default_value = "8000", env)]
    api_port: u16,
    #[clap(
        long,
        default_value = "postgres://postgres:postgrespw@localhost:5432/mvr",
        env
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
        network,
        api_port,
        metrics_address,
        database_url,
    } = Args::parse();

    let cancel = CancellationToken::new();

    run_server(
        database_url,
        db_args,
        network,
        api_port,
        cancel.child_token(),
        metrics_address,
    )
    .await?;

    Ok(())
}
