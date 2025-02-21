module public_names::public_names;

use mvr::app_record::AppCap;
use mvr::move_registry::MoveRegistry;
use mvr_subdomain_proxy::utils;
use std::string::String;
use sui::clock::Clock;
use sui::dynamic_field as df;
use suins::subdomain_registration::SubDomainRegistration;
use suins::suins_registration::SuinsRegistration;

use fun df::add as UID.add;
use fun df::exists_with_type as UID.exists_with_type;
use fun df::borrow_mut as UID.borrow_mut;
use fun df::remove as UID.remove;

const EInvalidType: u64 = 0;
const EUnauthorized: u64 = 1;

public struct SuinsNftKey() has copy, drop, store;

public struct PublicName has key {
    id: UID,
    capability_id: ID,
}

public struct PublicNameCap has key, store {
    id: UID,
    valid_for: ID,
}

#[allow(lint(self_transfer))]
public fun new_sld(nft: SuinsRegistration, ctx: &mut TxContext) {
    let (mut name, capability) = new(ctx);
    name.id.add(SuinsNftKey(), nft);

    transfer::share_object(name);
    transfer::public_transfer(capability, ctx.sender());
}

#[allow(lint(self_transfer))]
public fun new_subdomain(nft: SubDomainRegistration, ctx: &mut TxContext) {
    let (mut name, capability) = new(ctx);
    name.id.add(SuinsNftKey(), nft);
    transfer::share_object(name);
    transfer::public_transfer(capability, ctx.sender());
}

/// Create a new app in the registry.
public fun create_app(
    pg: &mut PublicName,
    registry: &mut MoveRegistry,
    name: String,
    clock: &Clock,
    ctx: &mut TxContext,
): AppCap {
    let key = SuinsNftKey();

    if (pg.id.exists_with_type<_, SuinsRegistration>(key)) {
        let nft: &mut SuinsRegistration = pg.id.borrow_mut(key);
        registry.register(nft, name, clock, ctx)
    } else {
        let nft: &mut SubDomainRegistration = pg.id.borrow_mut(key);
        utils::register(registry, nft, name, clock, ctx)
    }
}

/// Destroys the `PublicName` and returns the NFT to the owner.
public fun destroy<T: store>(pg: PublicName, cap: PublicNameCap): T {
    let key = SuinsNftKey();
    assert!(pg.id.exists_with_type<_, T>(key), EInvalidType);
    assert!(cap.is_valid_for(&pg), EUnauthorized);

    let PublicName { mut id, .. } = pg;

    let nft: T = id.remove(key);
    id.delete();

    let PublicNameCap { id, .. } = cap;
    id.delete();

    nft
}

fun is_valid_for(cap: &PublicNameCap, pg: &PublicName): bool {
    cap.valid_for == pg.id.to_inner()
}

fun new(ctx: &mut TxContext): (PublicName, PublicNameCap) {
    let capability_id = object::new(ctx);
    let name = PublicName {
        id: object::new(ctx),
        capability_id: capability_id.to_inner(),
    };

    let capability = PublicNameCap {
        id: capability_id,
        valid_for: name.id.to_inner(),
    };

    (name, capability)
}
