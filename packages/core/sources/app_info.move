module core::app_info;

public struct AppInfo has copy, store, drop {
    package_info_id: Option<ID>,
    package_address: Option<address>,
    upgrade_cap_id: Option<ID>,
}

public fun new(
    package_info_id: Option<ID>,
    package_address: Option<address>,
    upgrade_cap_id: Option<ID>,
): AppInfo {
    AppInfo {
        package_info_id,
        package_address,
        upgrade_cap_id,
    }
}

public fun default(): AppInfo {
    AppInfo {
        package_info_id: option::none(),
        package_address: option::none(),
        upgrade_cap_id: option::none(),
    }
}
