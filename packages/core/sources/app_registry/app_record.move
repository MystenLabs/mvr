module core::app_record {
    use std::string::String;
    use sui::{
        vec_map::{Self, VecMap},
    };
    use core::name::Name;
    use package_info::package_info::PackageInfo;

    const EPackageAlreadyAssigned: u64 = 1;

    public struct AppRecord has key, store {
        id: UID,
        // The Capability object used for managing the `AppRecord`.
        app_cap_id: ID,
        // The `PackageInfo` ID for mainnet. This can be optional
        // if a name is created before attaching a mainnet package (e.g. for testnet/devnet)
        package_info_id: Option<ID>,
        // The `UpgradeCap` ID on mainnet. We only store it in case we wanna give any "super-admin"
        // capabilities to `upgrade_cap` holders.
        upgrade_cap_id: Option<ID>,
        // This is what being resolved across networks.
        networks: VecMap<String, ID>,
        // Any read-only metadata for the record.
        metadata: VecMap<String, String>,
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
            id: object::new(ctx),
            app_cap_id: cap.id.to_inner(),
            package_info_id: option::none(),
            upgrade_cap_id: option::none(),
            networks: vec_map::empty(),
            metadata: vec_map::empty()
        }, cap)
    }

    /// Assigns a `PackageInfo` to the record.
    public(package) fun assign_package(
        record: &mut AppRecord,
        package_info: &PackageInfo
    ) {
        assert!(record.package_info_id.is_none(), EPackageAlreadyAssigned);

        record.package_info_id = option::some(package_info.id());
        record.upgrade_cap_id = option::some(package_info.upgrade_cap_id());
    }

    /// Set a specified network target ID.
    /// Even though our standard live networks are `TESTNET, DEVNET`,
    /// we allow this to be custom-set, so any new 
    /// networks can also be used in the future (e.g. BRIDGENET, PRIVATENET)
    public(package) fun set_network(
        record: &mut AppRecord,
        network: String,
        target: ID
    ) {
        if (record.networks.contains(&network)) {
            record.networks.remove(&network);
        };

        record.networks.insert(network, target);
    }

    /// Checks if the record is immutable (mainnet package has been attached).
    public(package) fun is_immutable(
        record: &AppRecord
    ): bool {
        record.package_info_id.is_some()
    }

    public(package) fun burn(
        record: AppRecord
    ) {
        let AppRecord {
            id,
            app_cap_id: _,
            package_info_id: _,
            upgrade_cap_id: _,
            networks: _,
            metadata: _,
        } = record;

        id.delete();
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
