#[test_only]
module package_info::package_info_tests;

use package_info::package_info::{Self, PackageInfo};
use sui::{
    package,
    test_scenario::{Self, Scenario, begin, end, return_shared, take_shared_by_id},
    transfer::public_transfer
};

const ALICE: address = @0xAAAA;
const BOB: address = @0xBBBB;
const PACKAGE: address = @0xBEEF;

public struct SharedObject has key, store {
    id: UID,
}

#[test]
fun test_receive() {
    let mut test = begin(ALICE);
    let shared_address = share_object_for_testing(&mut test);

    test.next_tx(ALICE);
    let mut upgrade_cap = package::test_publish(PACKAGE.to_id(), test.ctx());
    let info = package_info::new(&mut upgrade_cap, test.ctx());
    let info_id = info.id();
    public_transfer(upgrade_cap, ALICE);
    package_info::transfer(info, shared_address);

    test.next_tx(BOB);
    let mut shared_object = test.take_shared_by_id<SharedObject>(shared_address.to_id());
    let receiving_ticket = test_scenario::receiving_ticket_by_id<PackageInfo>(info_id);
    let received_info = package_info::receive(&mut shared_object.id, receiving_ticket);
    assert!(received_info.package_address() == PACKAGE);
    package_info::transfer(received_info, BOB);

    return_shared(shared_object);

    end(test);
}

fun share_object_for_testing(test: &mut Scenario): address {
    test.next_tx(ALICE);

    let shared = SharedObject {
        id: object::new(test.ctx()),
    };
    let addr = shared.id.to_address();

    transfer::public_share_object(shared);

    addr
}
