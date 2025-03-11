/// A simple re-usable struct to store an app's information.
module mvr::app_info;

public struct AppInfo has copy, drop, store {
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
