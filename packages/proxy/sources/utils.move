module mvr_subdomain_proxy::utils;

use mvr::{app_record::AppCap, move_registry::MoveRegistry};
use std::string::String;
use sui::clock::Clock;
use suins::subdomain_registration::SubDomainRegistration;

/// No testing needed, we're only calling public functions.
public fun register(
    registry: &mut MoveRegistry,
    nft: &SubDomainRegistration,
    name: String,
    clock: &Clock,
    ctx: &mut TxContext,
): AppCap {
    registry.register(nft.nft(), name, clock, ctx)
}
