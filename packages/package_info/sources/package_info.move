module package_info::package_info {
    use std::string::String;

    use sui::{
        package::{Self, UpgradeCap},
        table::{Self, Table},
        vec_map::{Self, VecMap},
        dynamic_field as df
    };

    use package_info::{
        label::{Self, Label},
        git::GitInfo,
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
        label: Label,
        // The styling of the PackageInfo object
        style: Style,
        // the ID of the upgrade cap
        upgrade_cap_id: ID,
        // the address of the package (no version specified, any version that got attached)
        // Resolution of particular versions will occur through the RPCs versioned resolvers.
        package_address: address,
        // We can hold any metadata we want for the package (up to obj size limit).
        metadata: VecMap<String, String>,
        // We can hold the git versioning here.
        git_versioning: Table<u64, GitInfo>,
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
            label: label::new(b"".to_string()),
            style: style::default(),
            package_address: cap.upgrade_package().to_address(),
            upgrade_cap_id: object::id(cap),
            metadata: vec_map::empty(),
            git_versioning: table::new(ctx)
        }
    }

    public fun set_label(
        info: &mut PackageInfo,
        label: String
    ) {
        info.label = label::new(label);
    }

    public fun set_style(
        info: &mut PackageInfo,
        style: Style
    ) {
        info.style = style;
    }

    // Set any metadata for the NFT.
    public fun set_metadata(
        info: &mut PackageInfo,
        key: String,
        value: String
    ) {
        info.metadata.insert(key, value);
    }

    /// Unset any plain-text metadata from the NFT.
    public fun unset_metadata(
        info: &mut PackageInfo,
        key: String
    ) {
        info.metadata.remove(&key);
    }

    /// Allows us to set the github metadata for any given version of a package.
    /// 
    /// This is helpful for:
    /// 1. Source validation services: It will work on all set versions with the correct source code on those revisions.
    /// 2. Development process: Easy to depend on any version of the package.
    public fun set_git_versioning(
        info: &mut PackageInfo,
        version: u64,
        git_info: GitInfo
    ) {
        // we do it in an "add or update" fashion for each key.
        if (info.git_versioning.contains(version)) {
            info.git_versioning.remove(version);
        };
        info.git_versioning.add(version, git_info);
    }

    /// Allows the owner to attach any other logic / DFs to the NFT.
    public fun set_custom_metadata<K: copy + store + drop, V: store>(
        info: &mut PackageInfo,
        key: K,
        value: V
    ) {
        df::add(&mut info.id, key, value);
    }

    /// Allows removing any custom metadata from the NFT.
    public fun remove_custom_metadata<K: copy + store + drop, V: store>(
        info: &mut PackageInfo,
        key: K
    ): V {
        df::remove(&mut info.id, key)
    }
    
    /// Last PTB call (or ownership change).
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
