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


/// The package's version.
/// This is unlikely to change, and is only here for security
/// purposes (in case anything is miss-configured)
const VERSION: u8 = 1;

#[error]
const EAppAlreadyRegistered: vector<u8> = b"App has already been assigned and is immutable.";
#[error]
const EUnauthorized: vector<u8> = b"Unauthorized access to the app.";
#[error]
const EAppDoesNotExist: vector<u8> = b"App does not exist.";
#[error]
const ENSNameExpired: vector<u8> = b"SuiNS name has expired and cannot be used.";
#[error]
const EVersionMismatch: vector<u8> = b"Version mismatch. Please use the latest package version.";

/// The shared object holding the registry of packages.
/// There are no "admin" actions for this registry, apart from the
/// version bump, which is only used in case of emergency.
public struct MoveRegistry has key {
    id: UID,
    registry: Table<Name, AppRecord>,
    version: u8,
}

/// This capability can manage the package's version, and adding/removing configs.
/// It is only used in case of emergency or expansion of the registry.
public struct VersionCap has key, store {
    id: UID,
}

/// The OTW to claim Publisher.
public struct MOVE_REGISTRY has drop {}

/// When initializing this, we create the shared object.
/// There's only one shared object, and no "admin" functionality here.
fun init(otw: MOVE_REGISTRY, ctx: &mut TxContext) {
    package::claim_and_keep(otw, ctx);
    transfer::public_transfer(
        VersionCap { id: object::new(ctx) },
        ctx.sender(),
    );
    transfer::share_object(MoveRegistry {
        id: object::new(ctx),
        registry: table::new(ctx),
        version: VERSION,
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
    registry.assert_is_valid_version();
    let app_name = name::new(name, nft.domain());
    assert!(!nft.has_expired(clock), ENSNameExpired);

    let (new_record, cap) = app_record::new(app_name, object::id(nft), ctx);
    registry.registry.add(app_name, new_record);

    cap
}

/// Allows removing an app from the registry,
/// only if the app is not immutable (no mainnet package has been assigned).
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
    registry.assert_is_valid_version();
    let app_name = name::new(name, nft.domain());
    assert!(!nft.has_expired(clock), ENSNameExpired);
    assert!(registry.registry.contains(app_name), EAppDoesNotExist);

    let record = registry.registry.remove(app_name);
    record.burn();
}

/// Assigns a package to the given app.
/// When this assignment is done, the app becomes immutable.
///
/// In a realistic scenario, this is when we attach an app
/// to a package on mainnet.
public fun assign_package(registry: &mut MoveRegistry, cap: &mut AppCap, info: &PackageInfo) {
    registry.assert_is_valid_version();
    let record = registry.borrow_record_mut(cap);
    assert!(!record.is_immutable(), EAppAlreadyRegistered);
    record.assign_package(cap, info);
}

/// Sets a network's value for a given app name.
public fun set_network(registry: &mut MoveRegistry, cap: &AppCap, network: String, info: AppInfo) {
    registry.assert_is_valid_version();
    let record = registry.borrow_record_mut(cap);
    record.set_network(network, info);
}

/// Removes a network's value for a given app name.
/// Should be used to clean-up frequently re-publishing networks (e.g. devnet).
public fun unset_network(registry: &mut MoveRegistry, cap: &AppCap, network: String) {
    registry.assert_is_valid_version();
    let record = registry.borrow_record_mut(cap);
    record.unset_network(network);
}

/// Burns a cap and the record associated with it, if the cap is still valid for
/// that record.
public fun burn_cap(registry: &mut MoveRegistry, cap: AppCap) {
    registry.assert_is_valid_version();
    let record = registry.registry.borrow(cap.app());

    // If the cap is still valid for the record, we can remove the record too.
    if (cap.is_valid_for(record)) {
        let record = registry.registry.remove(cap.app());
        record.burn();
    };

    cap.burn_cap();
}

/// Set the version of the registry.
public fun set_version(registry: &mut MoveRegistry, _: &VersionCap, version: u8) {
    registry.assert_is_valid_version();
    registry.version = version;
}

/// Check if an app is part of the registry.
public fun app_exists(registry: &MoveRegistry, name: Name): bool {
    registry.registry.contains(name)
}

/// Set metadata for the app record.
public fun set_metadata(registry: &mut MoveRegistry, cap: &AppCap, key: String, value: String) {
    registry.borrow_record_mut(cap).set_metadata_key(key, value);
}

/// Unset metadata for the app record.
public fun unset_metadata(registry: &mut MoveRegistry, cap: &AppCap, key: String) {
    registry.borrow_record_mut(cap).unset_metadata_key(key);
}

/// Borrows a record for a given cap.
/// Aborts if the app does not exist or the cap is not still valid for the
/// record.
fun borrow_record_mut(registry: &mut MoveRegistry, cap: &AppCap): &mut AppRecord {
    assert!(registry.app_exists(cap.app()), EAppDoesNotExist);
    let record = registry.registry.borrow_mut(cap.app());
    assert!(cap.is_valid_for(record), EUnauthorized);
    record
}

/// Validate the version of the registry.
fun assert_is_valid_version(registry: &MoveRegistry) {
    assert!(registry.version == VERSION, EVersionMismatch);
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(MOVE_REGISTRY {}, ctx)
}

#[test_only]
public(package) fun borrow_record(registry: &MoveRegistry, cap: &AppCap): &AppRecord {
    registry.registry.borrow(cap.app())
}
