/// For .move service, we do not have a strict mapping between the domain style
/// and the packages.
/// 
/// Our names have a fixed style, which is created like:
/// `app_name@org_name`, and versioning can be used only on the RPC layer to 
/// determine the version (e.g v2.app_name@org_name).
/// 
/// The only restrictions that apply to a label are:
/// - It must be up to 64 characters per label
/// - It can only contain alphanumeric characters, in lower case, and dashes
module core::name {
    use std::string::String;

    const EInvalidName: u64 = 1;
    const EInvalidDepth: u64 = 2;
    const EInvalidLength: u64 = 3;
    const ENotAnApp: u64 = 4;

    const MAX_LABEL_LENGTH: u64 = 64;
    const MAX_LENGTH: u64 = 129; // 64 * 2 + 1 (separator)
    const MAX_DEPTH: u64 = 2;

    const SEPARATOR: vector<u8> = b"@";

    public struct Name has copy, store, drop {
        // the labels of the label e.g. [org, example]. Keeping them reverse for consistency
        // with SuiNS
        labels: vector<String>,
        // The normalized version of the label (e.g. `example@org`)
        normalized: String
    }

    public fun new(name: String): Name {
        let labels = split_by_separator(name);
        validate_labels(&labels);

        assert!(name.length() <= MAX_LENGTH, EInvalidLength);
        assert!(labels.length() <= MAX_DEPTH, EInvalidDepth);

        Name {
            labels,
            normalized: name
        }
    }

    /// Get the depth of a `Name`
    public fun depth(name: &Name): u64 {
        name.labels.length()
    }

    /// Get the `org` from a `Name`
    /// E.g. `example@org` returns `org`
    public fun org(name: &Name): &String {
        name.label(0)
    }

    /// Check if a `Name` is an `app`
    public fun is_app(name: &Name): bool {
        name.depth() > 1
    }
    
    /// Check if a `Name` is an `org`
    public fun is_org(name: &Name): bool {
        name.depth() == 1
    }

    /// Check if a `Name` has a matching `org` with another name.
    public fun is_valid_for(org: &Name, name: &Name): bool {
        org.is_org() && name.org() == org.org()
    }

    /// Get the `app` from a `Name`. 
    /// E.g. `example@org` returns `example`
    public fun app(name: &Name): &String {
        assert!(name.is_app(), ENotAnApp);
        name.label(1)
    }

    public fun normalized(name: &Name): String {
        name.normalized
    }

    public fun label(name: &Name, level: u64): &String {
        &name.labels[level]
    }

    public(package) fun validate_labels(labels: &vector<String>) {
        assert!(!labels.is_empty(), EInvalidName);

        let len = labels.length();
        let mut index = 0;

        while (index < len) {
            let label = &labels[index];
            assert!(is_valid_label(label), EInvalidName);
            index = index + 1;
        }
    }

    public(package) fun split_by_separator(mut name: String): vector<String> {
        let mut labels: vector<String> = vector[];
        let separator = SEPARATOR.to_string();

        while(!name.is_empty()) {
            let next_separator_index = name.index_of(&separator);
            let part = name.sub_string(0, next_separator_index);
            labels.push_back(part);

            let next_portion = if (next_separator_index == name.length()) {
                name.length()
            } else {
                next_separator_index + 1
            };

            name = name.sub_string(next_portion, name.length());
        };

        labels.reverse();
        labels
    }

    fun is_valid_label(label: &String): bool {
        let len = label.length();
        let label_bytes = label.bytes();
        let mut index = 0;

        if (len < 1 || len > MAX_LABEL_LENGTH) {
            return false
        };

        while (index < len) {
            let character = label_bytes[index];
            let is_valid_character =
                (0x61 <= character && character <= 0x7A)                   // a-z
                || (0x30 <= character && character <= 0x39)                // 0-9
                || (character == 0x2D && index != 0 && index != len - 1);  // '-' not at beginning or end

            if (!is_valid_character) {
                return false
            };

            index = index + 1;
        };

        true
    }
}
