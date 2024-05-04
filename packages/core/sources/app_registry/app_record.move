module core::app_record {
    use std::string::String;
    use sui::{
        vec_map::{Self, VecMap},
    };

    use package_info::package_info::PackageInfo;

    public struct AppRecord has key, store {
        id: UID,
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

    /// Returns a plain `AppRecord` to be populated.
    public(package) fun default(ctx: &mut TxContext): AppRecord {
        AppRecord {
            id: object::new(ctx),
            package_info_id: option::none(),
            upgrade_cap_id: option::none(),
            networks: vec_map::empty(),
            metadata: vec_map::empty()
        }
    }

    /// Assigns a `PackageInfo` to the record.
    public(package) fun assign_package(
        record: &mut AppRecord,
        package_info: &PackageInfo
    ) {
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
}
