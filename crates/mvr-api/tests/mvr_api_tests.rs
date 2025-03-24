use mvr_test_cluster::MvrTestCluster;
use sui_types::base_types::ObjectID;
#[cfg(test)]
mod mvr_test_cluster;

fn v1_id() -> String {
    ObjectID::from_single_byte(0xc1).to_canonical_string(true)
}

fn v2_id() -> String {
    ObjectID::from_single_byte(0xc2).to_canonical_string(true)
}

#[tokio::test]
async fn test_lookups_regular() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;
    test_cluster.setup_dummy_data().await?;

    let mut response = test_cluster
        .bulk_resolution(&["@test/core", "@test/core/1"])
        .await?;

    assert_eq!(
        response["@test/core"]["package_id"].as_str().unwrap(),
        v2_id()
    );
    assert_eq!(
        response["@test/core/1"]["package_id"].as_str().unwrap(),
        v1_id()
    );

    response = test_cluster.bulk_resolution(&["@test/core/3"]).await?;

    assert!(response["@test/core/3"]["package_id"].is_null());

    test_cluster.teardown();
    Ok(())
}

#[tokio::test]
async fn test_lookups_non_existent() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;

    let response = test_cluster.bulk_resolution(&["@random/name"]).await?;
    assert!(response["@random/name"]["package_id"].is_null());

    test_cluster.teardown();
    Ok(())
}

#[tokio::test]
async fn test_reverse_resolution() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;
    test_cluster.setup_dummy_data().await?;

    let response = test_cluster
        .bulk_reverse_resolution(&["0xc1", "0xc2", "0x1"])
        .await?;
    assert_eq!(response[v2_id()]["name"].as_str().unwrap(), "@test/core");
    assert_eq!(response[v1_id()]["name"].as_str().unwrap(), "@test/core");
    assert!(response[ObjectID::from_single_byte(0x1).to_canonical_string(true)]["name"].is_null());

    test_cluster.teardown();
    Ok(())
}

#[tokio::test]
async fn test_type_resolution() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;
    test_cluster.setup_dummy_data().await?;

    let response = test_cluster
        .bulk_type_resolution(&[
            "@test/core::c::C",
            "@test/core::c::D",
            "@test/core::c::WPhantomTypeParam",
            "@test/core::c::WPhantomTypeParam<u64>",
        ])
        .await?;

    // check V1 resolution works by name.
    assert_eq!(
        response["@test/core::c::C"]["type_tag"].as_str().unwrap(),
        format!("{}::c::C", v1_id())
    );

    // Check V2 resolution works by name.
    assert_eq!(
        response["@test/core::c::D"]["type_tag"].as_str().unwrap(),
        format!("{}::c::D", v2_id())
    );

    // This won't work on the type resolution API, we need to go through the "Struct definition" API.
    assert!(response["@test/core::c::WPhantomTypeParam"]["type_tag"].is_null());

    // Check V2 resolution works by name.
    assert_eq!(
        response["@test/core::c::WPhantomTypeParam<u64>"]["type_tag"]
            .as_str()
            .unwrap(),
        format!("{}::c::WPhantomTypeParam<u64>", v1_id())
    );

    test_cluster.teardown();
    Ok(())
}

#[tokio::test]

async fn test_struct_definition() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;
    test_cluster.setup_dummy_data().await?;

    let response = test_cluster
        .bulk_struct_definition(&[
            "@test/core::c::C",
            "@test/core::c::D",
            "@test/core::c::WPhantomTypeParam",
        ])
        .await?;

    // check V1 resolution works by name.
    assert_eq!(
        response["@test/core::c::C"]["type_tag"].as_str().unwrap(),
        format!("{}::c::C", v1_id())
    );

    // Check V2 resolution works by name.
    assert_eq!(
        response["@test/core::c::D"]["type_tag"].as_str().unwrap(),
        format!("{}::c::D", v2_id())
    );

    // In the struct definition API, now we can query without the generic type params.
    assert_eq!(
        response["@test/core::c::WPhantomTypeParam"]["type_tag"]
            .as_str()
            .unwrap(),
        format!("{}::c::WPhantomTypeParam", v1_id())
    );

    test_cluster.teardown();
    Ok(())
}
