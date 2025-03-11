use clap::Parser;
use reqwest::Client;
use std::fs;
use url::Url;

#[derive(Parser)]
#[clap(rename_all = "kebab-case", author, version)]
struct Args {
    #[clap(env, long)]
    checkpoint: u64,
    #[clap(env, long, default_value = "https://checkpoints.mainnet.sui.io")]
    checkpoint_url: Url,
}
#[tokio::main]
async fn main() {
    let Args {
        checkpoint,
        checkpoint_url,
    } = Args::parse();

    let client = Client::new();
    let url = checkpoint_url
        .join(&format!("/{checkpoint}.chk"))
        .expect("Unexpected invalid URL");
    let response = client.get(url).send().await.unwrap();

    fs::write(format!("{checkpoint}.chk"), response.bytes().await.unwrap()).unwrap();
}
