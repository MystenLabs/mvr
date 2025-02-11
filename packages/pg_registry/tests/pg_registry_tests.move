module pg_registry::pg_registry_tests;

use mvr::move_registry::{Self, MoveRegistry};
use pg_registry::pg_registry::{Self, PublicGoodName, PublicGoodNameCap};
use sui::clock::{Self, Clock};
use sui::test_scenario::{Self as ts, Scenario};
use sui::test_utils::destroy;
use suins::domain;
use suins::subdomain_registration as sub_nft;
use suins::suins_registration::{Self as ns_nft, SuinsRegistration};

use fun wrapup as Scenario.wrap;

#[test]
fun test_e2e() {
    let (mut scenario, mut pg, cap, clock, mut registry) = test_init();

    let app = pg.create_app(
        &mut registry,
        b"test-app".to_string(),
        &clock,
        scenario.ctx(),
    );

    // validate that we just registered the `test-app` under `@test` without owning the nft.
    assert!(app.name().to_string() == b"@test/test-app".to_string());

    scenario.next_tx(@0x1);

    // now let's get back the NFT as the cap holder.
    let nft: SuinsRegistration = pg.destroy(cap);

    assert!(nft.domain_name() == b"test.sui".to_string());

    destroy(app);
    destroy(nft);

    scenario.wrap(clock, registry);
}

fun wrapup(
    scenario: Scenario,
    clock: Clock,
    registry: MoveRegistry,
) {
    ts::return_shared(registry);

    clock.destroy_for_testing();
    scenario.end();
}

fun test_init(): (Scenario, PublicGoodName, PublicGoodNameCap, Clock, MoveRegistry) {
    let mut scenario = ts::begin(@0x0);
    move_registry::init_for_testing(scenario.ctx());

    scenario.next_tx(@0x0);
    let clock = clock::create_for_testing(scenario.ctx());

    let domain = domain::new(b"test.sui".to_string());

    let nft = ns_nft::new_for_testing(domain, 1, &clock, scenario.ctx());

    pg_registry::new_sld(nft, scenario.ctx());

    scenario.next_tx(@0x0);

    let pg = scenario.take_shared<PublicGoodName>();
    let cap = scenario.take_from_sender<PublicGoodNameCap>();
    let registry = scenario.take_shared<MoveRegistry>();

    (scenario, pg, cap, clock, registry)
}
