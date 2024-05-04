/// AppRegistry holds all the Apps saved in the system.
/// This table is immutable, once an entry goes in, it can never be replaced
/// (following the mutability scheme of packages).
/// 
/// The flow is that someone can come in with a `DotMove` object and
/// register an app for that name. (e.g. coming in with `@test` and registering `app@test`)
/// Once an app is registered, an a mainnet `PackageInfo` is set, it cannot ever be mutated.
/// That retains the strong assurance that a name can always point to a single package 
/// (across any version of it).
/// 
/// We do not store all the package addresses (for different versions). Instead, we rely on the 
/// RPCs to resolve a package at a specified address.
module core::app_registry {
    use std::string::String;
    use sui::{
        table::{Self, Table},
    };

    use core::{
        app_record::{Self, AppRecord},
        dot_move::{Self, DotMove},
    };

    /// The shared object holding the registry of packages.
    /// There are no "admin" actions for this registry.
    public struct AppRegistry has key {
        id: UID,
        registry: Table<String, AppRecord>
    }

    fun init(ctx: &mut TxContext){
        transfer::share_object(AppRegistry {
            id: object::new(ctx),
            registry: table::new(ctx)
        })
    }
}
