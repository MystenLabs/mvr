module mvr::config_keys;

public struct MetadataKey() has copy, drop, store;

public fun new_metadata_key(): MetadataKey {
    MetadataKey()
}
