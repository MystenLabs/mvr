#[test_only]
module mvr::mvr_tests;

use mvr::app_info;
use mvr::move_registry::{Self, MoveRegistry, VersionCap};
use mvr::name;
use package_info::package_info;
use std::string::String;
use sui::clock::{Self, Clock};
use sui::package;
use sui::test_scenario::{Self as ts, Scenario};
use suins::domain;
use suins::suins_registration::{Self, SuinsRegistration};

use fun cleanup as Scenario.cleanup;
use fun ns_nft as Scenario.ns_nft;

const ADDR_1: address = @0x0;

const DOMAIN_1: vector<u8> = b"org.sui";
const APP_1: vector<u8> = b"app";

#[test]
fun test_move_registry_plain() {
    let (mut scenario, mut registry, clock) = test_setup();
    scenario.next_tx(ADDR_1);

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);
    // register first app!
    let cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );

    assert!(registry.app_exists(name::new(APP_1.to_string(), ns_nft.domain())));

    scenario.next_tx(ADDR_1);

    let cid = b"rand".to_string();
    // set a network with a valid cap.
    registry.set_network(
        &cap,
        cid,
        app_info::default(),
    );

    registry.unset_network(&cap, cid);

    // remove the app normally since we have not yet assigned a pkg.
    registry.remove(&ns_nft, APP_1.to_string(), &clock, scenario.ctx());

    assert!(
        !registry.app_exists(name::new(APP_1.to_string(), ns_nft.domain())),
    );

    transfer::public_transfer(cap, scenario.ctx().sender());
    transfer::public_transfer(ns_nft, scenario.ctx().sender());

    scenario.cleanup(registry, clock);
}

#[test]
fun test_immutable_packages() {
    let (mut scenario, mut registry, clock) = test_setup();
    scenario.next_tx(ADDR_1);

    // publish ap ackage `0xdee` and create a package info object for the
    // package.
    let mut upgrade_cap = package::test_publish(@0xdee.to_id(), scenario.ctx());
    let pkg_info = package_info::new(&mut upgrade_cap, scenario.ctx());

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);
    // register first app!
    let mut app_cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );
    // assign the package to the app.
    registry.assign_package(&mut app_cap, &pkg_info);

    assert!(app_cap.is_cap_immutable());
    assert!(registry.app_exists(name::new(APP_1.to_string(), ns_nft.domain())));

    transfer::public_transfer(upgrade_cap, scenario.ctx().sender());
    transfer::public_transfer(app_cap, scenario.ctx().sender());
    transfer::public_transfer(ns_nft, scenario.ctx().sender());
    pkg_info.transfer(scenario.ctx().sender());

    scenario.cleanup(registry, clock);
}

#[test]
fun test_burn_cap_with_valid_app() {
    let (mut scenario, mut registry, clock) = test_setup();
    scenario.next_tx(ADDR_1);

    // publish ap ackage `0xdee` and create a package info object for the
    // package.
    let mut upgrade_cap = package::test_publish(@0xdee.to_id(), scenario.ctx());
    let pkg_info = package_info::new(&mut upgrade_cap, scenario.ctx());

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);
    // register first app!
    let app_cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );

    registry.burn_cap(app_cap);
    assert!(
        !registry.app_exists(name::new(APP_1.to_string(), ns_nft.domain())),
    );

    transfer::public_transfer(upgrade_cap, scenario.ctx().sender());
    transfer::public_transfer(ns_nft, scenario.ctx().sender());
    pkg_info.transfer(scenario.ctx().sender());

    scenario.cleanup(registry, clock);
}

#[test]
fun test_burn_cap_without_matching_record() {
    let (mut scenario, mut registry, clock) = test_setup();
    scenario.next_tx(ADDR_1);

    // publish ap ackage `0xdee` and create a package info object for the
    // package.
    let mut upgrade_cap = package::test_publish(@0xdee.to_id(), scenario.ctx());
    let pkg_info = package_info::new(&mut upgrade_cap, scenario.ctx());

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);
    // register first app!
    let app_cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );

    registry.remove(&ns_nft, APP_1.to_string(), &clock, scenario.ctx());

    // re-register same app after removal.
    let app_cap_2 = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );
    // burn the cap
    registry.burn_cap(app_cap);
    assert!(registry.app_exists(name::new(APP_1.to_string(), ns_nft.domain())));

    transfer::public_transfer(upgrade_cap, scenario.ctx().sender());
    transfer::public_transfer(ns_nft, scenario.ctx().sender());
    transfer::public_transfer(app_cap_2, scenario.ctx().sender());
    pkg_info.transfer(scenario.ctx().sender());

    scenario.cleanup(registry, clock);
}

#[
    test,
    expected_failure(
        abort_code = ::mvr::app_record::ECannotBurnImmutableRecord,
    ),
]
fun try_to_remove_immutable() {
    let (mut scenario, mut registry, clock) = test_setup();
    scenario.next_tx(ADDR_1);

    // publish ap ackage `0xdee` and create a package info object for the
    // package.
    let mut upgrade_cap = package::test_publish(@0xdee.to_id(), scenario.ctx());
    let pkg_info = package_info::new(&mut upgrade_cap, scenario.ctx());

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);
    // register first app!
    let mut app_cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );
    // assign the package to the app.
    registry.assign_package(&mut app_cap, &pkg_info);
    registry.remove(&ns_nft, APP_1.to_string(), &clock, scenario.ctx());

    abort 1337
}

#[
    test,
    expected_failure(
        abort_code = ::mvr::move_registry::EAppAlreadyRegistered,
    ),
]
fun try_to_assign_twice() {
    let (mut scenario, mut registry, clock) = test_setup();
    scenario.next_tx(ADDR_1);

    // publish ap ackage `0xdee` and create a package info object for the
    // package.
    let mut upgrade_cap = package::test_publish(@0xdee.to_id(), scenario.ctx());
    let pkg_info = package_info::new(&mut upgrade_cap, scenario.ctx());

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);
    // register first app!
    let mut app_cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );
    // assign the package to the app.
    registry.assign_package(&mut app_cap, &pkg_info);
    // try to re-assign the pkg_info. This should fail as we're already
    // assigned.
    registry.assign_package(&mut app_cap, &pkg_info);

    abort 1337
}

#[test, expected_failure(abort_code = ::mvr::move_registry::EAppDoesNotExist)]
fun try_to_remove_non_existing_app() {
    let (mut scenario, mut registry, clock) = test_setup();
    scenario.next_tx(ADDR_1);

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);
    registry.remove(&ns_nft, APP_1.to_string(), &clock, scenario.ctx());

    abort 1337
}

#[test, expected_failure(abort_code = ::mvr::move_registry::EVersionMismatch)]
fun try_to_call_invalid_version() {
    let (mut scenario, mut registry, clock) = test_setup();
    scenario.next_tx(ADDR_1);

    let version_cap = scenario.take_from_sender<VersionCap>();

    // change version to 0, which is an invalid version.
    registry.set_version(&version_cap, 0);

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);
    // register first app!
    let _app_cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );

    abort 1337
}

#[test, expected_failure(abort_code = ::mvr::move_registry::ENSNameExpired)]
fun try_to_use_expired_name() {
    let (mut scenario, mut registry, mut clock) = test_setup();
    scenario.next_tx(ADDR_1);

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);
    clock.set_for_testing(ns_nft.expiration_timestamp_ms() + 1);

    let mut _app_cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );

    abort 1337
}

#[test, expected_failure(abort_code = ::mvr::move_registry::ENSNameExpired)]
fun try_to_remove_app_with_expired_name() {
    let (mut scenario, mut registry, mut clock) = test_setup();
    scenario.next_tx(ADDR_1);

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);

    let mut _app_cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );

    clock.set_for_testing(ns_nft.expiration_timestamp_ms() + 1);
    registry.remove(&ns_nft, APP_1.to_string(), &clock, scenario.ctx());

    abort 1337
}

#[test, expected_failure(abort_code = ::mvr::move_registry::ENSNameExpired)]
fun test_app_override_invalid_cap() {
    let (mut scenario, mut registry, mut clock) = test_setup();
    scenario.next_tx(ADDR_1);

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);

    let mut _app_cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );

    clock.set_for_testing(ns_nft.expiration_timestamp_ms() + 1);
    registry.remove(&ns_nft, APP_1.to_string(), &clock, scenario.ctx());

    abort 1337
}

#[test, expected_failure(abort_code = ::mvr::move_registry::EAppDoesNotExist)]
fun try_to_edit_a_non_existing_record() {
    let (mut scenario, mut registry, clock) = test_setup();
    scenario.next_tx(ADDR_1);

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);

    let app_cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );
    registry.remove(&ns_nft, APP_1.to_string(), &clock, scenario.ctx());

    registry.set_network(&app_cap, b"rand".to_string(), app_info::default());

    abort 1337
}

#[test, expected_failure(abort_code = ::mvr::move_registry::EUnauthorized)]
fun try_to_use_unauthorized_cap() {
    let (mut scenario, mut registry, clock) = test_setup();
    scenario.next_tx(ADDR_1);

    let ns_nft = scenario.ns_nft(DOMAIN_1.to_string(), &clock);

    let app_cap = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );
    registry.remove(&ns_nft, APP_1.to_string(), &clock, scenario.ctx());

    // re-register same app to get another matching appc ap
    let _app_cap_2 = registry.register(
        &ns_nft,
        APP_1.to_string(),
        &clock,
        scenario.ctx(),
    );

    registry.set_network(&app_cap, b"rand".to_string(), app_info::default());

    abort 1337
}

// Test function helpers
fun ns_nft(
    scenario: &mut Scenario,
    org: String,
    clock: &Clock,
): SuinsRegistration {
    suins_registration::new_for_testing(
        domain::new(org),
        1,
        clock,
        scenario.ctx(),
    )
}

fun cleanup(mut scenario: Scenario, registry: MoveRegistry, clock: Clock) {
    scenario.next_tx(ADDR_1);
    ts::return_shared(registry);
    ts::return_shared(clock);
    scenario.end();
}

fun test_setup(): (Scenario, MoveRegistry, Clock) {
    let mut scenario = ts::begin(ADDR_1);
    scenario.next_tx(ADDR_1);

    move_registry::init_for_testing(scenario.ctx());
    let clock = clock::create_for_testing(scenario.ctx());
    clock.share_for_testing();

    scenario.next_tx(ADDR_1);
    let registry = scenario.take_shared<MoveRegistry>();
    let clock = scenario.take_shared<Clock>();

    (scenario, registry, clock)
}
