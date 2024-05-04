module package_info::package_info {
    use std::string::String;

    use sui::{
        package::{Self, UpgradeCap},
        table::{Self, Table},
        vec_map::{Self, VecMap},
        dynamic_field
    };

    use package_info::{
        github::GithubInfo,
        style::{Self, Style},
    };

    const ECannotCreateDuringUpgrade: u64 = 1;

    /// OTW to claim `Display` for this package.
    public struct PACKAGE_INFO has drop {}

    /// The `PackageInfo` struct holds all the metadata needed about a package.
    /// This object is `key` only to make sure it's indexable at all times,
    /// as it acts as the source of truth for the .move service,
    /// and is guaranteed to be an owned object (key only + only transfer only available)
    public struct PackageInfo has key {
        id: UID,
        // the label: Used in Display & other places to distinguish packages easily.
        label: String,
        style: Style,
        // the ID of the upgrade cap
        upgrade_cap_id: ID,
        // the address of the package (no version specified, any version that got attached)
        // Resolution of particular versions will occur through the RPCs versioned resolvers.
        package_address: address,
        // We can hold any metadata we want for the package (up to obj size limit).
        metadata: VecMap<String, String>,
        // We can hold the github versioning here.
        github_versioning: Table<u64, GithubInfo>,
    }

    fun init(otw: PACKAGE_INFO, ctx: &mut TxContext) {
        package::claim_and_keep(otw, ctx);
    }

    // Create a new empty `PackageInfo` object for a given `upgrade_cap`.
    public fun new(
        cap: &mut UpgradeCap,
        ctx: &mut TxContext,
    ): PackageInfo {
        assert!(cap.upgrade_package().to_address() != @0x0, ECannotCreateDuringUpgrade);

        PackageInfo {
            id: object::new(ctx),
            label: b"".to_string(),
            style: style::default(),
            package_address: cap.upgrade_package().to_address(),
            upgrade_cap_id: object::id(cap),
            metadata: vec_map::empty(),
            github_versioning: table::new(ctx)
        }
    }

    public fun set_label(
        info: &mut PackageInfo,
        label: String
    ) {
        info.label = label;
    }

    public fun set_style(
        info: &mut PackageInfo,
        style: Style
    ) {
        info.style = style;
    }

    // Set some metadata for a package.
    public fun set_metadata(
        info: &mut PackageInfo,
        key: String,
        value: String
    ) {
        info.metadata.insert(key, value);
    }

    /// Allows us to set the github metadata for any given version of a package.
    /// 
    /// This is helpful for:
    /// 1. Source validation services: It will work on all set versions with the correct source code on those revisions.
    /// 2. Development process: Easy to depend on any version of the package.
    public fun set_github_versioning(
        info: &mut PackageInfo,
        version: u64,
        github_info: GithubInfo
    ) {
        // we do it in an "add or update" fashion for each key.
        if (info.github_versioning.contains(version)) {
            info.github_versioning.remove(version);
        };
        info.github_versioning.add(version, github_info);
    }

    /// Allows the owner to attach any other logic / DFs.
    public fun set_custom_metadata<K: copy + store + drop, V: store>(
        info: &mut PackageInfo,
        key: K,
        value: V
    ) {
        dynamic_field::add(&mut info.id, key, value);
    }
    
    /// Last PTB call (or ownership transfer).
    public fun transfer(info: PackageInfo, to: address) {
        transfer::transfer(info, to)
    }

    /// === Getters === 
    public fun id(info: &PackageInfo): ID {
        info.id.to_inner()
    }

    public fun package_address(info: &PackageInfo): address {
        info.package_address
    }
    
    public fun upgrade_cap_id(info: &PackageInfo): ID {
        info.upgrade_cap_id
    }
}
