use std::path::PathBuf;

use insta::assert_snapshot;
use mvr::utils::manifest::MoveToml;

#[test]
fn test_regular_manifest() {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.extend(["tests", "templates"]);

    let mut move_toml = MoveToml::new(path.join("regular.toml")).unwrap();

    move_toml.add_dependency("mvr_demo", "@mvr/demo").unwrap();
    move_toml
        .add_dependency("another_demo", "@mvr/another_demo")
        .unwrap();

    move_toml.set_network("mainnet".to_string()).unwrap();

    assert_snapshot!(move_toml.doc.to_string());
}

#[test]
fn test_manifest_with_no_dependencies() {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.extend(["tests", "templates"]);

    let mut move_toml = MoveToml::new(path.join("missing_deps.toml")).unwrap();

    move_toml.add_dependency("mvr_demo", "@mvr/demo").unwrap();
    move_toml.set_network("mainnet".to_string()).unwrap();

    assert_snapshot!(move_toml.doc.to_string());
}
