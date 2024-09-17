/// MoveRegistry holds all the Apps saved in the system.
/// This table is immutable, once an entry goes in, it can never be replaced
/// (following the mutability scheme of packages).
///
/// The flow is that someone can come in with a `DotMove` object and
/// register an app for that name. (e.g. coming in with `@test` and registering
/// `app@test`)2
/// Once an app is registered, an a mainnet `AppInfo` is set, it cannot ever be
/// mutated.
/// That retains the strong assurance that a name can always point to a single
/// package
/// (across any version of it).
///
/// We do not store all the package addresses (for different versions). Instead,
/// we rely on the
/// RPCs to resolve a package at a specified address.
module mvr::move_registry;

use mvr::app_info::AppInfo;
use mvr::app_record::{Self, AppRecord, AppCap};
use mvr::name::{Self, Name};
use package_info::package_info::PackageInfo;
use std::string::String;
use sui::clock::Clock;
use sui::package;
use sui::table::{Self, Table};
use suins::suins_registration::SuinsRegistration;

/// The app is already registered and is immutable.
const EAppAlreadyRegistered: u64 = 1;
/// The user is not authorized to perform the action.
const EUnauthorized: u64 = 2;
/// The app does not exist.
const EAppDoesNotExist: u64 = 3;
/// The given `SuinsRegistration` object has expired.
const ENSNameExpired: u64 = 4;
/// We do not allow subnames in the current phase.
const ECannotRegisterWithSubname: u64 = 5;
/// The app is immutable and cannot be removed.
const EAlreadyImmutable: u64 = 6;

/// The shared object holding the registry of packages.
/// There are no "admin" actions for this registry.
public struct MoveRegistry has key {
    id: UID,
    registry: Table<Name, AppRecord>,
}

/// The OTW to claim Publisher.
public struct MOVE_REGISTRY has drop {}

/// When initializing this, we create the shared object.
/// There's only one shared object, and no "admin" functionality here.
fun init(otw: MOVE_REGISTRY, ctx: &mut TxContext) {
    package::claim_and_keep(otw, ctx);
    transfer::share_object(MoveRegistry {
        id: object::new(ctx),
        registry: table::new(ctx),
    })
}

/// Allows to register a new app with the given `SuinsRegistration` object.
/// The `SuinsRegistration` object is used for validation.
///
/// Aborts if:
/// 1. The app is already registered and is immutable 
/// 2. The given `SuinsRegistration` object has expired
/// 3. The given `SuinsRegistration` object is a subdomain
public fun register(
    registry: &mut MoveRegistry,
    nft: &SuinsRegistration,
    name: String,
    clock: &Clock,
    ctx: &mut TxContext,
): AppCap {
    let app_name = name::new(name, nft.domain());
    assert!(!nft.has_expired(clock), ENSNameExpired);
    // We do not allow subnames in the current phase.
    assert!(!nft.domain().is_subdomain(), ECannotRegisterWithSubname);

    let (new_record, cap) = app_record::new(app_name, object::id(nft), ctx);
    registry.registry.add(app_name, new_record);

    cap
}

/// Allows removing an app from the registry,
/// only if the app is not immutable 
/// (no mainnet package has been assigned).
/// 
/// Aborts if:
/// 1. The app does not exist
/// 2. The app is immutable
/// 3. The given `SuinsRegistration` object has expired
public fun remove(
    registry: &mut MoveRegistry,
    nft: &SuinsRegistration,
    name: String,
    clock: &Clock,
    _ctx: &mut TxContext,
) {
    let app_name = name::new(name, nft.domain());
    assert!(!nft.has_expired(clock), ENSNameExpired);
    assert!(registry.registry.contains(app_name), EAppDoesNotExist);

    let record = registry.registry.remove(app_name);
    assert!(!record.is_immutable(), EAlreadyImmutable);

    record.burn();
}

/// Assigns a package to the given app.
/// When this assignment is done, the app becomes immutable.
///
/// In a realistic scenario, this is when we attach an app
/// to a package on mainnet.
public fun assign_package(
    registry: &mut MoveRegistry,
    cap: &mut AppCap,
    info: &PackageInfo,
) {
    let record = registry.borrow_record_mut(cap);
    assert!(!record.is_immutable(), EAppAlreadyRegistered);
    record.assign_package(cap, info);
}

/// Sets a network's value for a given app name.
public fun set_network(
    registry: &mut MoveRegistry,
    cap: &AppCap,
    network: String,
    info: AppInfo,
) {
    let record = registry.borrow_record_mut(cap);
    record.set_network(network, info);
}

/// Removes a network's value for a given app name.
/// Should be used to clean-up frequently re-publishing networks (e.g. devnet).
public fun unset_network(
    registry: &mut MoveRegistry,
    cap: &AppCap,
    network: String,
) {
    let record = registry.borrow_record_mut(cap);
    record.unset_network(network);
}

/// Check if an app is part of the registry.
public(package) fun app_exists(registry: &MoveRegistry, name: Name): bool {
    registry.registry.contains(name)
}

/// Borrows a record for a given cap.
/// Aborts if the app does not exist or the cap is not still valid for the
/// record.
fun borrow_record_mut(
    registry: &mut MoveRegistry,
    cap: &AppCap,
): &mut AppRecord {
    assert!(registry.app_exists(cap.app()), EAppDoesNotExist);
    let record = registry.registry.borrow_mut(cap.app());
    assert!(cap.is_valid_for(record), EUnauthorized);
    record
}


#[test_only]
public(package) fun init_for_testing(ctx: &mut TxContext) {
    init(MOVE_REGISTRY {}, ctx)
}