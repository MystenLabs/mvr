module core::app_tests;

use core::app;
use suins::domain::{Self, Domain};

#[test]
fun app_to_string() {
    let mut app = app::new(b"app".to_string(), classic_domain());
    assert!(app.to_string() == b"@org/app".to_string());

    app =
        app::new(
            b"app".to_string(),
            domain::new(b"nested.org.sui".to_string()),
        );
    assert!(app.to_string() == b"nested@org/app".to_string());

    app =
        app::new(
            b"app".to_string(),
            domain::new(b"even.nested.org.sui".to_string()),
        );
    assert!(app.to_string() == b"even.nested@org/app".to_string());

    app =
        app::new(
            b"app".to_string(),
            domain::new(b"maybe.even.more.nested.org.sui".to_string()),
        );
    assert!(app.to_string() == b"maybe.even.more.nested@org/app".to_string());
}

#[test, expected_failure(abort_code = ::core::app::EInvalidName)]
fun create_empty_failure() {
    app::new(b"".to_string(), classic_domain());
}

#[test, expected_failure(abort_code = ::core::app::EInvalidName)]
fun create_invalid_label_failure() {
    app::new(b"-app".to_string(), classic_domain());
}

#[test, expected_failure(abort_code = ::core::app::EInvalidName)]
fun create_invalid_domain_failure() {
    app::new(b"app-".to_string(), classic_domain());
}

#[test, expected_failure(abort_code = ::core::app::EInvalidName)]
fun create_invalid_tld_failure() {
    app::new(b"ap@o".to_string(), classic_domain());
}

fun classic_domain(): Domain {
    domain::new(b"org.sui".to_string())
}
