module mvr::app_record;

use mvr::app_info::{Self, AppInfo};
use mvr::constants;
use mvr::name::Name;
use package_info::package_info::PackageInfo;
use std::string::String;
use sui::vec_map::{Self, VecMap};

const EPackageAlreadyAssigned: u64 = 1;
/// The network ID was not found.
const ENetworkNotFound: u64 = 2;
/// The maximum number of networks has been reached, a cleanup needs to be done.
const EMaxNetworksReached: u64 = 3;

public struct AppRecord has store {
    /// The Capability object used for managing the `AppRecord`.
    app_cap_id: ID,
    /// The SuiNS registration object that created this record.
    ns_nft_id: ID,
    // The mainnet `AppInfo` object. This is optional until a `mainnet` package
    // is mapped to a record, making the record immutable.
    app_info: Option<AppInfo>,
    // This is what being resolved for external networks.
    networks: VecMap<String, AppInfo>,
    // Any read-only metadata for the record.
    metadata: VecMap<String, String>,
    // Any extra data that needs to be stored.
    // Unblocks TTO, and DFs extendability.
    storage: UID,
}

public struct AppCap has key, store {
    id: UID,
    /// We save the referenced App for easier off-chain management & on-chain
    /// access.
    name: Name,
    /// Whether the app is immutable on the main network.
    /// Also utilized for `Display` purposes.
    is_immutable: bool,
}

/// Returns a plain `AppRecord` to be populated.
public(package) fun new(
    name: Name,
    ns_nft_id: ID,
    ctx: &mut TxContext,
): (AppRecord, AppCap) {
    let cap = AppCap {
        id: object::new(ctx),
        name,
        is_immutable: false,
    };

    (
        AppRecord {
            app_info: option::none(),
            app_cap_id: cap.id.to_inner(),
            ns_nft_id,
            networks: vec_map::empty(),
            metadata: vec_map::empty(),
            storage: object::new(ctx),
        },
        cap,
    )
}

/// Assigns a `PackageInfo` to the record.
public(package) fun assign_package(
    record: &mut AppRecord,
    cap: &mut AppCap,
    package_info: &PackageInfo,
) {
    assert!(record.app_info.is_none(), EPackageAlreadyAssigned);
    cap.is_immutable = true;
    record.app_info =
        option::some(
            app_info::new(
                option::some(package_info.id()),
                option::some(package_info.package_address()),
                option::some(package_info.upgrade_cap_id()),
            ),
        );
}

/// Set a specified network ID (we expect a chain identifier) -> AppInfo.
public(package) fun set_network(
    record: &mut AppRecord,
    network: String,
    info: AppInfo,
) {
    if (record.networks.contains(&network)) {
        record.networks.remove(&network);
    };
    assert!(
        record.networks.size() < constants::max_networks!(),
        EMaxNetworksReached,
    );
    record.networks.insert(network, info);
}

/// Removes a network target ID
public(package) fun unset_network(record: &mut AppRecord, network: String) {
    assert!(record.networks.contains(&network), ENetworkNotFound);
    record.networks.remove(&network);
}

/// Checks if the record is immutable (mainnet package has been attached).
public(package) fun is_immutable(record: &AppRecord): bool {
    record.app_info.is_some()
}

public(package) fun burn(record: AppRecord) {
    let AppRecord { storage, .. } = record;

    storage.delete();
}

/// Checks if the supplied capability is valid for the record.
public(package) fun is_valid_for(cap: &AppCap, record: &AppRecord): bool {
    record.app_cap_id == cap.id.to_inner()
}

public(package) fun app(cap: &AppCap): Name {
    cap.name
}
