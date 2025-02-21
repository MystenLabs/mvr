module public_names::public_names_tests;

use mvr::move_registry::{Self, MoveRegistry};
use public_names::public_names::{Self, PublicName, PublicNameCap};
use sui::clock::{Self, Clock};
use sui::test_scenario::{Self as ts, Scenario};
use sui::test_utils::destroy;
use suins::domain;
use suins::registry;
use suins::subdomain_registration::{Self as sub_nft, SubDomainRegistration};
use suins::suins_registration::{Self as ns_nft, SuinsRegistration};

use fun wrapup as Scenario.wrap;

#[test]
fun test_e2e() {
    let (mut scenario, clock, mut registry) = test_init();

    let (mut pg, cap) = new_sld(
        new_sld_nft(&mut scenario, &clock, b"test.sui"),
        &mut scenario,
    );

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

#[test]
fun test_subdomain_e2e() {
    let (mut scenario, clock, mut registry) = test_init();
    let subname_nft = new_subdomain_nft(&mut scenario, &clock, b"inner.another.sui");

    scenario.next_tx(@0x1);

    public_names::new_subdomain(subname_nft, scenario.ctx());

    scenario.next_tx(@0x1);

    let cap = scenario.take_from_sender<PublicNameCap>();
    let mut pg = scenario.take_shared<PublicName>();

    let app = pg.create_app(
        &mut registry,
        b"test-app".to_string(),
        &clock,
        scenario.ctx(),
    );

    // validate that we just registered the `test-app` under `@test` without owning the nft.
    assert!(app.name().to_string() == b"inner@another/test-app".to_string());

    scenario.next_tx(@0x1);

    // now let's get back the NFT as the cap holder.
    let nft: SubDomainRegistration = pg.destroy(cap);

    assert!(nft.nft().domain_name() == b"inner.another.sui".to_string());

    destroy(app);
    destroy(nft);

    scenario.wrap(clock, registry);
}

#[test, expected_failure(abort_code = ::public_names::public_names::EUnauthorized)]
fun test_destroy_unauthorized() {
    let (mut scenario, clock, _registry) = test_init();

    let (pg, _cap) = new_sld(
        new_sld_nft(&mut scenario, &clock, b"test.sui"),
        &mut scenario,
    );

    let (_pg2, cap2) = new_sld(
        new_sld_nft(&mut scenario, &clock, b"another.sui"),
        &mut scenario,
    );

    scenario.next_tx(@0x0);

    // try to get back the NFT with the wrong cap
    let _nft: SuinsRegistration = pg.destroy(cap2);
    abort 1337
}

#[test, expected_failure(abort_code = ::public_names::public_names::EInvalidType)]
fun test_destroy_with_invalid_type() {
    let (mut scenario, clock, _registry) = test_init();

    let (pg, cap) = new_sld(
        new_sld_nft(&mut scenario, &clock, b"test.sui"),
        &mut scenario,
    );

    // try to get back the NFT with the wrong cap
    let _nft: SubDomainRegistration = pg.destroy(cap);
    abort 1337
}

fun wrapup(scenario: Scenario, clock: Clock, registry: MoveRegistry) {
    ts::return_shared(registry);

    clock.destroy_for_testing();
    scenario.end();
}

fun new_sld(nft: SuinsRegistration, scenario: &mut Scenario): (PublicName, PublicNameCap) {
    scenario.next_tx(@0x1);
    public_names::new_sld(nft, scenario.ctx());
    scenario.next_tx(@0x1);

    let cap = scenario.take_from_sender<PublicNameCap>();
    let pg = scenario.take_shared<PublicName>();

    (pg, cap)
}

fun new_subdomain(
    nft: SubDomainRegistration,
    scenario: &mut Scenario,
): (PublicName, PublicNameCap) {
    scenario.next_tx(@0x1);
    public_names::new_subdomain(nft, scenario.ctx());
    scenario.next_tx(@0x1);

    let cap = scenario.take_from_sender<PublicNameCap>();
    let pg = scenario.take_shared<PublicName>();

    (pg, cap)
}

fun new_sld_nft(scenario: &mut Scenario, clock: &Clock, name: vector<u8>): SuinsRegistration {
    let domain = domain::new(name.to_string());

    ns_nft::new_for_testing(domain, 1, clock, scenario.ctx())
}

fun new_subdomain_nft(
    scenario: &mut Scenario,
    clock: &Clock,
    name: vector<u8>,
): SubDomainRegistration {
    let mut ns_registry = registry::new_for_testing(scenario.ctx());
    let domain = domain::new(name.to_string());

    let subdomain = ns_registry.wrap_subdomain(
        ns_nft::new_for_testing(domain, 1, clock, scenario.ctx()),
        clock,
        scenario.ctx(),
    );

    destroy(ns_registry);
    subdomain
}

fun test_init(): (Scenario, Clock, MoveRegistry) {
    let mut scenario = ts::begin(@0x0);
    move_registry::init_for_testing(scenario.ctx());

    scenario.next_tx(@0x0);
    let clock = clock::create_for_testing(scenario.ctx());

    scenario.next_tx(@0x0);
    let registry = scenario.take_shared<MoveRegistry>();

    (scenario, clock, registry)
}
