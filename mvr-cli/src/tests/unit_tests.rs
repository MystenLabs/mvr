use anyhow::Result;
use mvr::{
    resolve_move_dependencies, subcommand_add_dependency, subcommand_list,
    subcommand_register_name, subcommand_resolve_name, PackageInfoNetwork,
};

#[tokio::test]
async fn test_resolve_move_dependencies() -> Result<()> {
    Ok(())
}

#[tokio::test]
async fn test_subcommand_list() -> Result<()> {
    Ok(())
}

#[test]
fn test_package_info_network() {
    assert_eq!(PackageInfoNetwork::Mainnet.to_string(), "mainnet");
    assert_eq!(PackageInfoNetwork::Testnet.to_string(), "testnet");
}
