module core::app_record {
    use std::string::String;
    use sui::{
        vec_map::{Self, VecMap},
    };
    use core::{
        name::Name,
        app_info::{Self, AppInfo}
    };

    use package_info::package_info::PackageInfo;

    const EPackageAlreadyAssigned: u64 = 1;

    public struct AppRecord has store {
        // The Capability object used for managing the `AppRecord`.
        app_cap_id: ID,

        // The mainnet `AppInfo` object.
        // This is optional until a `mainnet` package is mapped to a record, making 
        // the record immutable.
        app_info: Option<AppInfo>,

        // This is what being resolved across networks.
        networks: VecMap<String, AppInfo>,
        // Any read-only metadata for the record.
        metadata: VecMap<String, String>,
        // Any extra data that needs to be stored.
        // Unblocks TTO, and DFs extendability.
        storage: UID,
    }

    public struct AppCap has key, store {
        id: UID,
        // we also save the name for better off-chain discoverability.
        name: Name
    }

    /// Returns a plain `AppRecord` to be populated.
    public(package) fun new(name: Name, ctx: &mut TxContext): (AppRecord, AppCap) {
        let cap = AppCap {
            id: object::new(ctx),
            name
        };

        (AppRecord {
            app_info: option::none(),
            app_cap_id: cap.id.to_inner(),
            networks: vec_map::empty(),
            metadata: vec_map::empty(),
            storage: object::new(ctx),
        }, cap)
    }

    /// Assigns a `PackageInfo` to the record.
    public(package) fun assign_package(
        record: &mut AppRecord,
        package_info: &PackageInfo
    ) {
        assert!(record.app_info.is_none(), EPackageAlreadyAssigned);
        record.app_info = option::some(app_info::new(
            option::some(package_info.id()),
            option::some(package_info.package_address()),
            option::some(package_info.upgrade_cap_id()),
        ));
    }

    /// Set a specified network target ID.
    /// Even though our standard live networks are `TESTNET, DEVNET`,
    /// we allow this to be custom-set, so any new
    public(package) fun set_network(
        record: &mut AppRecord,
        network: String,
        info: AppInfo
    ) {
        if (record.networks.contains(&network)) {
            record.networks.remove(&network);
        };

        record.networks.insert(network, info);
    }

    /// Checks if the record is immutable (mainnet package has been attached).
    public(package) fun is_immutable(
        record: &AppRecord
    ): bool {
        record.app_info.is_some()
    }

    public(package) fun burn(
        record: AppRecord
    ) {
        let AppRecord {
            storage,
            app_info: _,
            app_cap_id: _,
            networks: _,
            metadata: _,
        } = record;

        storage.delete();
    }

    /// Checks if the supplied capability is valid for the record.
    public(package) fun is_valid_for(
        cap: &AppCap,
        record: &AppRecord
    ): bool {
        record.app_cap_id == cap.id.to_inner()
    }

    public(package) fun name(cap: &AppCap): Name {
        cap.name
    }
}
