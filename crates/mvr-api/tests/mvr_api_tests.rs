use insta::assert_snapshot;
use mvr_test_cluster::{add_name_record_to_database, MvrTestCluster};
use reqwest::StatusCode;
use serde_json::json;
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
        .bulk_reverse_resolution(&["0xc1", "0xc2", "0x1", &v1_id()]) // we dedup inside the API.
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

#[tokio::test]
async fn test_package_by_name() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;
    test_cluster.setup_dummy_data().await?;

    let (_, v2) = test_cluster.package_by_name("@test/core").await?;
    assert_snapshot!(v2.to_string());

    let (_, v1) = test_cluster.package_by_name("@test/core/1").await?;
    assert_snapshot!(v1.to_string());

    let (status, non_existent) = test_cluster.package_by_name("@test/does-not-exist").await?;

    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_snapshot!(non_existent.to_string());

    test_cluster.teardown();
    Ok(())
}

#[tokio::test]
async fn basic_search() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;
    test_cluster.setup_dummy_data().await?;

    let basic_dummy_data = test_cluster.search_names(None, None, None).await?;
    assert_snapshot!(basic_dummy_data.to_string());

    test_cluster.teardown();

    Ok(())
}

#[tokio::test]
async fn test_bulk_lookup_limit_exceeded() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;
    test_cluster.setup_dummy_data().await?;

    let object_ids = vec![ObjectID::from_single_byte(0xc1).to_string(); 51];
    let err = test_cluster
        .bulk_reverse_resolution(
            object_ids
                .iter()
                .map(|id| id.as_str())
                .collect::<Vec<_>>()
                .as_slice(),
        )
        .await
        .unwrap_err();

    assert_snapshot!(err.to_string());
    test_cluster.teardown();

    Ok(())
}

// A more advanced search that creates specific names, queries them and paginates.
// Also tests different page limits.
#[tokio::test]
async fn test_search_with_filters() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;
    let mut db = test_cluster.db_for_write().await?;

    add_name_record_to_database(&mut db, "@test/first", None, None, None).await?;
    add_name_record_to_database(&mut db, "@test/second", None, None, None).await?;
    add_name_record_to_database(&mut db, "@test/third", None, None, None).await?;

    add_name_record_to_database(&mut db, "@another/package", None, None, None).await?;
    add_name_record_to_database(&mut db, "@another/works", None, None, None).await?;

    add_name_record_to_database(&mut db, "@final/round", None, None, None).await?;

    let generic_query = test_cluster.search_names(None, None, None).await?;
    // no "filters", we should have all 6 names in the query.
    assert_eq!(generic_query["data"].as_array().unwrap().len(), 6);
    assert!(generic_query["next_cursor"].is_null());

    // now let's change "limit" to be 3, and check we can paginate in two pages.
    let mut query = test_cluster.search_names(None, None, Some(3)).await?;
    assert_eq!(query["data"].as_array().unwrap().len(), 3);
    assert!(query["next_cursor"].is_string());

    let next_cursor = query["next_cursor"].as_str().unwrap().to_string();

    // now let's paginate again.
    query = test_cluster
        .search_names(None, Some(next_cursor), Some(3))
        .await?;
    assert_eq!(query["data"].as_array().unwrap().len(), 3);
    assert!(query["next_cursor"].is_null());

    // now let's change the search query to be "@test"
    query = test_cluster
        .search_names(Some("@test".to_string()), None, None)
        .await?;
    assert_eq!(query["data"].as_array().unwrap().len(), 3);
    assert!(query["next_cursor"].is_null());

    // now let's change the search query to be "@another"
    query = test_cluster
        .search_names(Some("@another".to_string()), None, None)
        .await?;
    assert_eq!(query["data"].as_array().unwrap().len(), 2);
    assert!(query["next_cursor"].is_null());

    // now let's change the search query to be "@final"
    query = test_cluster
        .search_names(Some("@final".to_string()), None, None)
        .await?;
    assert_eq!(query["data"].as_array().unwrap().len(), 1);
    assert!(query["next_cursor"].is_null());

    // now let's change the search query to include names that have `fi` in them.
    query = test_cluster
        .search_names(Some("fi".to_string()), None, None)
        .await?;
    assert_eq!(query["data"].as_array().unwrap().len(), 2);
    assert!(query["next_cursor"].is_null());

    // now let's change the search query to include names that have `final` in them.
    query = test_cluster
        .search_names(Some("final".to_string()), None, None)
        .await?;
    assert_eq!(query["data"].as_array().unwrap().len(), 1);
    assert!(query["next_cursor"].is_null());

    test_cluster.teardown();

    Ok(())
}

fn names_of(response: &serde_json::Value) -> Vec<String> {
    response["data"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["name"].as_str().unwrap().to_string())
        .collect()
}

// Tests the exact `org` filter of the names endpoint, on its own and combined
// with pagination, `is_linked` and `search`.
#[tokio::test]
async fn test_search_by_org() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;
    let mut db = test_cluster.db_for_write().await?;

    let linked = || Some(ObjectID::from_single_byte(0x2).to_canonical_string(true));

    add_name_record_to_database(&mut db, "@deepbook/core", linked(), None, None).await?;
    add_name_record_to_database(&mut db, "@deepbook/margin", None, linked(), None).await?;
    add_name_record_to_database(&mut db, "@deepbook/token", None, None, None).await?;
    add_name_record_to_database(&mut db, "@deepbook/utils", None, None, None).await?;
    add_name_record_to_database(&mut db, "@deepbook/zeta", None, None, None).await?;

    // Names that share a prefix (or a suffix) with the org, but belong to a different one.
    add_name_record_to_database(&mut db, "@deep/core", None, None, None).await?;
    add_name_record_to_database(&mut db, "@deepbook-v3/core", None, None, None).await?;
    add_name_record_to_database(&mut db, "@deepbooks/core", None, None, None).await?;
    add_name_record_to_database(&mut db, "sub@deepbook/core", linked(), None, None).await?;
    add_name_record_to_database(&mut db, "other.sub@deepbook/core", None, None, None).await?;
    // The description mentions the org, which should not matter (unlike `search`).
    add_name_record_to_database(
        &mut db,
        "@another/deepbook",
        None,
        None,
        Some(json!({ "description": "A wrapper around @deepbook" })),
    )
    .await?;

    let deepbook = vec![
        "@deepbook/core",
        "@deepbook/margin",
        "@deepbook/token",
        "@deepbook/utils",
        "@deepbook/zeta",
    ];

    // Exact match, in both supported formats.
    // The org is not case sensitive (names are always lowercase).
    for org in ["@deepbook", "deepbook.sui", "@DeepBook", "DEEPBOOK.sui"] {
        let (status, query) = test_cluster.query_names(&[("org", org)]).await?;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(names_of(&query), deepbook);
        assert!(query["next_cursor"].is_null());
        assert_eq!(query["limit"], 20);
    }

    // A prefix of other orgs only matches its own names.
    let (_, query) = test_cluster.query_names(&[("org", "@deep")]).await?;
    assert_eq!(names_of(&query), vec!["@deep/core"]);

    let (_, query) = test_cluster.query_names(&[("org", "@deepbook-v3")]).await?;
    assert_eq!(names_of(&query), vec!["@deepbook-v3/core"]);

    // Subname orgs are separate orgs, in both supported formats.
    for org in ["sub@deepbook", "sub.deepbook.sui", "Sub@Deepbook"] {
        let (_, query) = test_cluster.query_names(&[("org", org)]).await?;
        assert_eq!(names_of(&query), vec!["sub@deepbook/core"]);
    }

    let (_, query) = test_cluster
        .query_names(&[("org", "other.sub@deepbook")])
        .await?;
    assert_eq!(names_of(&query), vec!["other.sub@deepbook/core"]);

    // An org without any names (even if it is a prefix of an existing one) is an empty page.
    for org in ["@deepboo", "@unknown", "unknown@deepbook"] {
        let (status, query) = test_cluster.query_names(&[("org", org)]).await?;
        assert_eq!(status, StatusCode::OK);
        assert!(names_of(&query).is_empty());
        assert!(query["next_cursor"].is_null());
    }

    // Pagination across pages (2 + 2 + 1).
    let mut paginated = vec![];
    let mut cursor: Option<String> = None;
    let mut pages = 0;

    loop {
        let mut params = vec![("org", "@deepbook"), ("limit", "2")];
        if let Some(cursor) = cursor.as_deref() {
            params.push(("cursor", cursor));
        }

        let (_, query) = test_cluster.query_names(&params).await?;
        let page = names_of(&query);
        assert!(page.len() <= 2);
        paginated.extend(page);
        pages += 1;

        match query["next_cursor"].as_str() {
            Some(next_cursor) => cursor = Some(next_cursor.to_string()),
            None => break,
        }
    }

    assert_eq!(pages, 3);
    assert_eq!(paginated, deepbook);

    // Combined with `is_linked`.
    let (_, query) = test_cluster
        .query_names(&[("org", "@deepbook"), ("is_linked", "true")])
        .await?;
    assert_eq!(names_of(&query), vec!["@deepbook/core", "@deepbook/margin"]);

    let (_, query) = test_cluster
        .query_names(&[("org", "@deepbook"), ("is_linked", "true"), ("limit", "1")])
        .await?;
    assert_eq!(names_of(&query), vec!["@deepbook/core"]);
    let cursor = query["next_cursor"].as_str().unwrap().to_string();

    let (_, query) = test_cluster
        .query_names(&[
            ("org", "@deepbook"),
            ("is_linked", "true"),
            ("limit", "1"),
            ("cursor", &cursor),
        ])
        .await?;
    assert_eq!(names_of(&query), vec!["@deepbook/margin"]);
    assert!(query["next_cursor"].is_null());

    let (_, query) = test_cluster
        .query_names(&[("org", "@deep"), ("is_linked", "true")])
        .await?;
    assert!(names_of(&query).is_empty());

    // Combined with `search`.
    let (_, query) = test_cluster
        .query_names(&[("org", "@deepbook"), ("search", "core")])
        .await?;
    assert_eq!(names_of(&query), vec!["@deepbook/core"]);

    let (_, query) = test_cluster
        .query_names(&[("org", "@another"), ("search", "deepbook")])
        .await?;
    assert_eq!(names_of(&query), vec!["@another/deepbook"]);

    // Invalid orgs are rejected.
    for org in [
        "",
        "deepbook",
        "@",
        "@deepbook/core",
        "@deepbook/",
        "@deep%25",
        "@deep_book",
        "deepbook.com",
    ] {
        let (status, _) = test_cluster.query_names(&[("org", org)]).await?;
        assert_eq!(status, StatusCode::BAD_REQUEST, "org: {org}");
    }

    let (status, invalid) = test_cluster.query_names(&[("org", "@deep%25")]).await?;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_snapshot!(invalid.to_string());

    test_cluster.teardown();

    Ok(())
}

#[tokio::test]
async fn test_sitemap() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;
    let mut db = test_cluster.db_for_write().await?;

    let linked = || Some(ObjectID::from_single_byte(0x2).to_canonical_string(true));

    add_name_record_to_database(&mut db, "@test/first", linked(), None, None).await?;
    add_name_record_to_database(&mut db, "@test/second", None, linked(), None).await?;
    add_name_record_to_database(&mut db, "@test/unlinked", None, None, None).await?;
    add_name_record_to_database(&mut db, "sub@test/app", linked(), None, None).await?;
    add_name_record_to_database(&mut db, "@another/package", linked(), linked(), None).await?;
    // An org that only has unlinked names is not part of the sitemap.
    add_name_record_to_database(&mut db, "@unlinked/package", None, None, None).await?;

    let sitemap = test_cluster.sitemap().await?;

    let mut locs: Vec<&str> = sitemap
        .split("<loc>")
        .skip(1)
        .map(|part| part.split_once("</loc>").unwrap().0)
        .collect();

    // static pages come first, followed by the (sorted) orgs.
    assert_eq!(
        locs[..7],
        [
            "https://www.moveregistry.com/",
            "https://www.moveregistry.com/orgs",
            "https://www.moveregistry.com/faq",
            "https://www.moveregistry.com/terms",
            "https://www.moveregistry.com/org/@another",
            "https://www.moveregistry.com/org/@test",
            "https://www.moveregistry.com/org/sub@test",
        ]
    );

    // the packages are not returned in a guaranteed order.
    let packages = locs.split_off(7);
    let mut packages_sorted = packages.clone();
    packages_sorted.sort();
    assert_eq!(
        packages_sorted,
        [
            "https://www.moveregistry.com/package/@another/package",
            "https://www.moveregistry.com/package/@test/first",
            "https://www.moveregistry.com/package/@test/second",
            "https://www.moveregistry.com/package/sub@test/app",
        ]
    );

    assert!(sitemap.starts_with(r#"<?xml version="1.0" encoding="UTF-8"?>"#));
    assert!(sitemap.ends_with("</urlset>"));
    assert_eq!(sitemap.matches("<url>").count(), 11);

    test_cluster.teardown();

    Ok(())
}

/// Returns the `(name, packages, icon_url)` of the orgs of a `/v1/orgs` response.
fn orgs_of(response: &serde_json::Value) -> Vec<(String, i64, Option<String>)> {
    response["data"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| {
            (
                item["name"].as_str().unwrap().to_string(),
                item["packages"].as_i64().unwrap(),
                item["icon_url"].as_str().map(str::to_string),
            )
        })
        .collect()
}

// Tests the orgs listing: only linked names count, ordering (most packages first,
// then by name), the icon selection, the public name flag, `search` and pagination.
#[tokio::test]
async fn test_orgs() -> Result<(), anyhow::Error> {
    let test_cluster = MvrTestCluster::new(None).await?;

    // No names at all: an empty (first) page.
    let (status, query) = test_cluster.query_orgs(&[]).await?;
    assert_eq!(status, StatusCode::OK);
    assert!(orgs_of(&query).is_empty());
    assert!(query["next_cursor"].is_null());
    assert_eq!(query["total"], 0);

    let mut db = test_cluster.db_for_write().await?;

    let linked = || Some(ObjectID::from_single_byte(0x2).to_canonical_string(true));

    let icon = |url: &str| Some(json!({ "icon_url": url }));

    // 4 linked names (mainnet only, testnet only, both) + 1 unlinked (not counted).
    // The icon is the one of the first (by name) linked name that has a (non-empty) one.
    add_name_record_to_database(&mut db, "@deepbook/a", linked(), None, None).await?;
    add_name_record_to_database(&mut db, "@deepbook/b", None, linked(), icon("")).await?;
    add_name_record_to_database(
        &mut db,
        "@deepbook/core",
        linked(),
        linked(),
        icon("https://deepbook.example/core.png"),
    )
    .await?;
    add_name_record_to_database(
        &mut db,
        "@deepbook/zeta",
        linked(),
        None,
        icon("https://deepbook.example/zeta.png"),
    )
    .await?;
    add_name_record_to_database(
        &mut db,
        "@deepbook/0-unlinked",
        None,
        None,
        icon("https://deepbook.example/unlinked.png"),
    )
    .await?;

    // Orgs that share a prefix with another org are separate orgs.
    add_name_record_to_database(&mut db, "@deep/core", linked(), None, None).await?;
    add_name_record_to_database(&mut db, "@deep/utils", linked(), None, None).await?;
    add_name_record_to_database(&mut db, "@deepbook-v3/core", linked(), None, None).await?;
    // Subname orgs are separate orgs too.
    add_name_record_to_database(
        &mut db,
        "sub@deepbook/core",
        linked(),
        None,
        icon("https://deepbook.example/sub.png"),
    )
    .await?;
    add_name_record_to_database(&mut db, "@another/package", None, linked(), None).await?;
    add_name_record_to_database(&mut db, "@another/second", linked(), None, None).await?;
    // An org that only has unlinked names is not listed.
    add_name_record_to_database(&mut db, "@unlinked/package", None, None, None).await?;

    let org = |name: &str, packages: i64, icon_url: Option<&str>| {
        (name.to_string(), packages, icon_url.map(str::to_string))
    };

    // Most packages first; ties are ordered by name (byte order).
    let all = vec![
        org("@deepbook", 4, Some("https://deepbook.example/core.png")),
        org("@another", 2, None),
        org("@deep", 2, None),
        org("@deepbook-v3", 1, None),
        org("sub@deepbook", 1, Some("https://deepbook.example/sub.png")),
    ];

    let (status, query) = test_cluster.query_orgs(&[]).await?;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(orgs_of(&query), all);
    assert!(query["next_cursor"].is_null());
    assert_eq!(query["limit"], 20);
    assert_eq!(query["total"], 5);
    assert_snapshot!(query.to_string());

    // Pagination across pages (2 + 2 + 1), including a tie on the packages count
    // that spans two pages. The total is not affected by the cursor.
    let mut paginated = vec![];
    let mut cursor: Option<String> = None;
    let mut pages = 0;

    loop {
        let mut params = vec![("limit", "2")];
        if let Some(cursor) = cursor.as_deref() {
            params.push(("cursor", cursor));
        }

        let (_, query) = test_cluster.query_orgs(&params).await?;
        let page = orgs_of(&query);
        assert!(page.len() <= 2);
        assert_eq!(query["total"], 5);
        paginated.extend(page);
        pages += 1;

        match query["next_cursor"].as_str() {
            // base64 can contain `+`, which is a space in a query string.
            Some(next_cursor) => cursor = Some(next_cursor.replace('+', "%2B")),
            None => break,
        }
    }

    assert_eq!(pages, 3);
    assert_eq!(paginated, all);

    // A cursor that points past the last org: an empty page, with the same total.
    let past_the_end = "eyJwYWNrYWdlcyI6MCwibmFtZSI6IiJ9"; // {"packages":0,"name":""}
    for params in [
        vec![("cursor", past_the_end)],
        vec![("cursor", past_the_end), ("search", "deep")],
    ] {
        let (status, query) = test_cluster.query_orgs(&params).await?;
        assert_eq!(status, StatusCode::OK);
        assert!(orgs_of(&query).is_empty());
        assert!(query["next_cursor"].is_null());
        assert_eq!(query["total"], if params.len() == 1 { 5 } else { 4 });
    }
    let (_, query) = test_cluster
        .query_orgs(&[("cursor", past_the_end), ("search", "unknown")])
        .await?;
    assert!(orgs_of(&query).is_empty());
    assert_eq!(query["total"], 0);

    // `search` is a (case-insensitive) substring match on the org name only.
    let names = |query: &serde_json::Value| -> Vec<String> {
        orgs_of(query)
            .into_iter()
            .map(|(name, _, _)| name)
            .collect()
    };

    for search in ["deep", "DEEP", "@deep", "%20deep%20"] {
        let (_, query) = test_cluster.query_orgs(&[("search", search)]).await?;
        assert_eq!(
            names(&query),
            vec!["@deepbook", "@deep", "@deepbook-v3", "sub@deepbook"],
            "search: {search}"
        );
        assert_eq!(query["total"], 4);
    }

    let (_, query) = test_cluster.query_orgs(&[("search", "book")]).await?;
    assert_eq!(
        names(&query),
        vec!["@deepbook", "@deepbook-v3", "sub@deepbook"]
    );

    let (_, query) = test_cluster.query_orgs(&[("search", "sub@")]).await?;
    assert_eq!(names(&query), vec!["sub@deepbook"]);

    // Combined with pagination.
    let (_, query) = test_cluster
        .query_orgs(&[("search", "deep"), ("limit", "3")])
        .await?;
    assert_eq!(names(&query), vec!["@deepbook", "@deep", "@deepbook-v3"]);
    assert_eq!(query["total"], 4);
    let cursor = query["next_cursor"].as_str().unwrap().replace('+', "%2B");

    let (_, query) = test_cluster
        .query_orgs(&[("search", "deep"), ("limit", "3"), ("cursor", &cursor)])
        .await?;
    assert_eq!(names(&query), vec!["sub@deepbook"]);
    assert!(query["next_cursor"].is_null());
    assert_eq!(query["total"], 4);

    // The app part of a name, `_` (a LIKE wildcard), unlinked orgs: no matches.
    for search in ["core", "_", "unlinked", "deepbook/"] {
        let (status, query) = test_cluster.query_orgs(&[("search", search)]).await?;
        assert_eq!(status, StatusCode::OK, "search: {search}");
        assert!(names(&query).is_empty(), "search: {search}");
        assert!(query["next_cursor"].is_null());
        assert_eq!(query["total"], 0);
    }

    // Public names (`@pkg`) are listed, flagged as such (orgs, including the ones
    // that merely look like a public name, are not), and never borrow the icon of
    // one of their (unrelated) packages.
    add_name_record_to_database(
        &mut db,
        "@pkg/one",
        linked(),
        None,
        icon("https://pkg.example/one.png"),
    )
    .await?;
    add_name_record_to_database(&mut db, "@pkg/two", linked(), None, None).await?;
    add_name_record_to_database(
        &mut db,
        "@pkgs/one",
        linked(),
        None,
        icon("https://pkgs.example/one.png"),
    )
    .await?;
    add_name_record_to_database(&mut db, "sub@pkg/one", linked(), None, None).await?;

    let (_, query) = test_cluster.query_orgs(&[("search", "pkg")]).await?;
    assert_eq!(
        orgs_of(&query),
        vec![
            org("@pkg", 2, None),
            org("@pkgs", 1, Some("https://pkgs.example/one.png")),
            org("sub@pkg", 1, None),
        ]
    );
    let flags: Vec<(String, bool)> = query["data"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| {
            (
                item["name"].as_str().unwrap().to_string(),
                item["is_public_name"].as_bool().unwrap(),
            )
        })
        .collect();
    assert_eq!(
        flags,
        vec![
            ("@pkg".to_string(), true),
            ("@pkgs".to_string(), false),
            ("sub@pkg".to_string(), false),
        ]
    );

    let (_, query) = test_cluster.query_orgs(&[]).await?;
    assert_eq!(query["total"], 8);
    assert_eq!(
        query["data"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|item| item["is_public_name"] == true)
            .count(),
        1
    );

    // A single org is the same item as the one of the listing, in every supported
    // format of the org (`%40` is `@`), whatever the case.
    let (_, listing) = test_cluster.query_orgs(&[]).await?;
    for item in listing["data"].as_array().unwrap() {
        let name = item["name"].as_str().unwrap();
        let (status, single) = test_cluster.get_org(name).await?;
        assert_eq!(status, StatusCode::OK, "org: {name}");
        assert_eq!(&single, item, "org: {name}");
    }

    let (_, deepbook) = test_cluster.get_org("@deepbook").await?;
    assert_eq!(deepbook["packages"], 4);
    assert_eq!(deepbook["icon_url"], "https://deepbook.example/core.png");
    assert_snapshot!("org", deepbook.to_string());

    for org in [
        "%40deepbook",
        "deepbook.sui",
        "@DeepBook",
        "%40DEEPBOOK",
        "DeepBook.sui",
    ] {
        let (status, single) = test_cluster.get_org(org).await?;
        assert_eq!(status, StatusCode::OK, "org: {org}");
        assert_eq!(single, deepbook, "org: {org}");
    }

    // An exact match: orgs that share a prefix, and subname orgs, are separate orgs.
    for (org, name, packages) in [
        ("@deep", "@deep", 2),
        ("@deepbook-v3", "@deepbook-v3", 1),
        ("sub@deepbook", "sub@deepbook", 1),
        ("sub.deepbook.sui", "sub@deepbook", 1),
        ("Sub%40DeepBook", "sub@deepbook", 1),
    ] {
        let (status, single) = test_cluster.get_org(org).await?;
        assert_eq!(status, StatusCode::OK, "org: {org}");
        assert_eq!(single["name"], name, "org: {org}");
        assert_eq!(single["packages"], packages, "org: {org}");
        assert_eq!(single["is_public_name"], false, "org: {org}");
    }

    // Public names are flagged, and never borrow an icon.
    let (status, pkg) = test_cluster.get_org("@pkg").await?;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(pkg["packages"], 2);
    assert_eq!(pkg["is_public_name"], true);
    assert!(pkg["icon_url"].is_null());

    // Orgs without linked names (unknown, a prefix of an existing one, unlinked
    // names only) are not found.
    for org in ["@unknown", "@deepboo", "other@deepbook", "@unlinked"] {
        let (status, _) = test_cluster.get_org(org).await?;
        assert_eq!(status, StatusCode::NOT_FOUND, "org: {org}");
    }

    let (_, not_found) = test_cluster.get_org("@Unknown").await?;
    assert_snapshot!("org_not_found", not_found.to_string());

    // Invalid orgs are rejected.
    for org in [
        "deepbook",
        "@",
        "@deep%25",
        "@deep_book",
        "@deep%5Cbook",
        "deepbook.com",
        "@deepbook%2Fcore",
        "%20",
    ] {
        let (status, _) = test_cluster.get_org(org).await?;
        assert_eq!(status, StatusCode::BAD_REQUEST, "org: {org}");
    }

    let (_, invalid) = test_cluster.get_org("@deep%25").await?;
    assert_snapshot!("org_invalid", invalid.to_string());

    // Invalid parameters are rejected.
    for params in [
        [("search", "deep%25")],
        [("search", "'%20OR%201=1")],
        [("limit", "51")],
        [("cursor", "not-a-cursor")],
    ] {
        let (status, _) = test_cluster.query_orgs(&params).await?;
        assert_eq!(status, StatusCode::BAD_REQUEST, "params: {params:?}");
    }

    let (status, invalid) = test_cluster.query_orgs(&[("search", "deep%25")]).await?;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_snapshot!(invalid.to_string());

    test_cluster.teardown();

    Ok(())
}
