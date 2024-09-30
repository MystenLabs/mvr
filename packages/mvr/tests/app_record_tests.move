module mvr::app_record_tests;

use mvr::app_info;
use mvr::app_record;
use mvr::constants;
use mvr::name::{Self, Name};
use package_info::package_info::{Self, PackageInfo};
use std::string::String;
use sui::package;
use suins::domain;

#[
    test,
    expected_failure(
        abort_code = ::mvr::app_record::EPackageAlreadyAssigned,
    ),
]
fun test_package_reassignment() {
    let mut ctx = tx_context::dummy();
    let (mut record, mut cap) = app_record::new(
        name(b"app".to_string()),
        @0x1.to_id(),
        &mut ctx,
    );
    // simple coverage :)
    assert!(cap.name() == name(b"app".to_string()));

    let pkg_info = pkg_info(&mut ctx);
    record.assign_package(&mut cap, &pkg_info);
    record.assign_package(&mut cap, &pkg_info);

    abort 1337
}

#[
    test,
    expected_failure(
        abort_code = ::mvr::app_record::ECannotBurnImmutableCap,
    ),
]
fun try_burn_immutable_cap() {
    let mut ctx = tx_context::dummy();
    let (mut record, mut cap) = app_record::new(
        name(b"app".to_string()),
        @0x1.to_id(),
        &mut ctx,
    );
    let pkg_info = pkg_info(&mut ctx);
    record.assign_package(&mut cap, &pkg_info);

    cap.burn_cap();

    abort 1337
}

#[test, expected_failure(abort_code = ::mvr::app_record::EMaxNetworksReached)]
fun try_create_too_many_network_entries() {
    let mut ctx = tx_context::dummy();
    let (mut record, cap) = app_record::new(
        name(b"app".to_string()),
        @0x1.to_id(),
        &mut ctx,
    );

    (constants::max_networks!() + 1).do!(|i| {
        record.set_network(i.to_string(), app_info::default());
    });

    abort 1337
}

#[test, expected_failure(abort_code = ::mvr::app_record::ENetworkNotFound)]
fun try_unset_non_existing_network() {
    let mut ctx = tx_context::dummy();
    let (mut record, _cap) = app_record::new(
        name(b"app".to_string()),
        @0x1.to_id(),
        &mut ctx,
    );

    record.unset_network(b"non-existing-network".to_string());

    abort 1337
}

fun name(app: String): Name {
    let domain = domain::new(b"random.sui".to_string());
    name::new(app, domain)
}

fun pkg_info(ctx: &mut TxContext): PackageInfo {
    let mut upgrade_cap = package::test_publish(@0xdee.to_id(), ctx);
    let pkg_info = package_info::new(&mut upgrade_cap, ctx);
    transfer::public_transfer(upgrade_cap, ctx.sender());
    pkg_info
}
