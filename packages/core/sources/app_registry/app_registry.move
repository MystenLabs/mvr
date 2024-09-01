/// AppRegistry holds all the Apps saved in the system.
/// This table is immutable, once an entry goes in, it can never be replaced
/// (following the mutability scheme of packages).
/// 
/// The flow is that someone can come in with a `DotMove` object and
/// register an app for that name. (e.g. coming in with `@test` and registering `app@test`)
/// Once an app is registered, an a mainnet `AppInfo` is set, it cannot ever be mutated.
/// That retains the strong assurance that a name can always point to a single package 
/// (across any version of it).
/// 
/// We do not store all the package addresses (for different versions). Instead, we rely on the 
/// RPCs to resolve a package at a specified address.
module core::app_registry {
    use std::string::String;
    use sui::{
        table::{Self, Table},
        clock::Clock,
    };
    use package_info::package_info::PackageInfo;

    use core::{
        app_record::{Self, AppRecord, AppCap},
        dot_move::DotMove,
        name::{Self, Name},
        app_info::AppInfo
    };

    const EAppAlreadyRegistered: u64 = 1;
    const EUnauthorized: u64 = 2;
    const EAppDoesNotExist: u64 = 3;
    const EDotMoveExpired: u64 = 4;

    /// The shared object holding the registry of packages.
    /// There are no "admin" actions for this registry.
    public struct AppRegistry has key {
        id: UID,
        registry: Table<Name, AppRecord>
    }

    /// When initializing this, we create the shared object.
    /// There's only one shared object, and no "admin" functionality here.
    fun init(ctx: &mut TxContext){
        transfer::share_object(AppRegistry {
            id: object::new(ctx),
            registry: table::new(ctx)
        })
    }

    /// Allows to register a new app with the given `DotMove` object.
    /// The `DotMove` object is used to validate the name.
    /// 
    /// Aborts if:
    /// 1. The app is already registered and is immutable (mainnet package info set).
    /// 2. The name is not valid for the given `DotMove` object.
    public fun register(
        registry: &mut AppRegistry,
        name: String,
        dot_move: &DotMove,
        clock: &Clock,
        ctx: &mut TxContext
    ): AppCap {
        let app_name = name::new(name);
        assert!(!dot_move.has_expired(clock), EDotMoveExpired);
        // Validate that the supplied name is indeed valid for the supplied `DotMove` name.
        assert!(dot_move.name().is_valid_for(&app_name), EUnauthorized);

        // check if the app already exists, and we can only ever replace if we have not set 
        // the mainnet package info.
        if (registry.registry.contains(app_name)) {
            let record = registry.registry.remove(app_name);
            assert!(!record.is_immutable(), EAppAlreadyRegistered);
            record.burn();
        };

        let (new_record, cap) = app_record::new(app_name, ctx);
        registry.registry.add(app_name, new_record);

        cap
    }

    /// Assigns a package to the given app.
    public fun assign_package(
        registry: &mut AppRegistry,
        cap: &AppCap,
        info: &PackageInfo,
    ) {
        assert!(registry.app_exists(cap.name()), EAppDoesNotExist);
        let record = registry.registry.borrow_mut(cap.name());
        assert!(cap.is_valid_for(record), EUnauthorized);
        assert!(!record.is_immutable(), EAppAlreadyRegistered);
        record.assign_package(info);
    }

    /// Sets a network's value for a given app name.
    public fun set_network(
        registry: &mut AppRegistry,
        cap: &AppCap,
        network: String,
        info: AppInfo,
    ) {
        // TODO: Limit this to known networks?
        assert!(registry.app_exists(cap.name()), EAppDoesNotExist);
        let record = registry.registry.borrow_mut(cap.name());
        assert!(cap.is_valid_for(record), EUnauthorized);
        record.set_network(network, info);
    }

    /// Check if an app is part of the registry.
    fun app_exists(registry: &AppRegistry, name: Name): bool {
        registry.registry.contains(name)
    }
}
