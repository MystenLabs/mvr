/// Our names have a fixed style, which is created in the format `@org/app`.
/// Versioning can be used only on the RPC layer to determine a fixed package
/// version (e.g @org/app:v1)).
///
/// The only restrictions that apply to a label are:
/// - It must be up to 64 characters per label
/// - It can only contain alphanumeric characters, in lower case, and dashes
/// (singular, not in the beginning or end)
module mvr::name;

use mvr::constants;
use std::string::String;
use suins::{constants as ns_constants, domain::Domain, suins_registration::SuinsRegistration};

#[error]
const EInvalidName: vector<u8> = b"Name format is invalid.";
#[error]
const ENotAName: vector<u8> = b"Something went extremely wrong.";
#[error]
const EUnknownTLD: vector<u8> = b"Unknown TLD.";

/// A name format is `@org/app`
/// We keep "org" part flexible, in a future world where SuiNS subdomains could
/// also be nested.
/// So `example@org/app` would also be valid, and `inner.example@org/app` would
/// also be valid.
public struct Name has copy, drop, store {
    /// The ORG part of the name is a SuiNS Domain.
    org: Domain,
    /// The APP part of the name. We keep it as a vector, even though it'll
    /// always be a single element.
    /// That allows us to extend the name further in the future.
    app: vector<String>,
}

/// Creates a new `Name`.
public fun new(app: String, org: Domain): Name {
    // validate that our app is a valid label.
    validate_labels(&vector[app]);

    Name {
        org,
        app: vector[app],
    }
}

/// Validates that the `Org` part
public fun has_valid_org(name: &Name, org: &SuinsRegistration): bool {
    name.org == org.domain()
}

/// Get the `app` from an `Name`.
/// E.g. `@org/example` returns `example`
public fun app(app: &Name): &String {
    assert!(app.app.length() == 1, ENotAName);
    &app.app[0]
}

/// Converts an `Name` to its string representation (e.g. `@org/app`,
/// `inner@org/app`)
public fun to_string(app: &Name): String {
    // start with the "org" part.
    let mut name = app.org_to_string();
    // now we process the app part.
    // we add the `/` separator
    name.append(constants::app_separator!());
    // append the "app" part
    name.append(app.app_to_string());
    name
}

public(package) fun org_to_string(app: &Name): String {
    let mut name = b"".to_string();

    // construct the "org" part.
    // Example nested format is `inner.example@org`
    let domain = app.org;
    let mut total_labels = domain.number_of_levels();

    // case where we are on a subdomain:
    while (total_labels > 2) {
        name.append(*domain.label(total_labels - 1));
        if (total_labels > 3) name.append(constants::dot_separator!());
        total_labels = total_labels - 1;
    };

    // We append the proper symbol. For .sui, this is `@`.
    name.append(get_tld_symbol(domain.tld()));
    // We add the domain. E.g. `example.sui` -> `@example`.
    name.append(*domain.sld());

    name
}

public(package) fun app_to_string(app: &Name): String {
    let mut name = b"".to_string();

    // Process the app labels (1 by 1, separated with dot for now).
    let app_labels = app.app;
    let mut labels_len = app_labels.length();

    app_labels.do!(|label| {
        labels_len = labels_len - 1;
        name.append(label);
        if (labels_len > 0) name.append(constants::dot_separator!());
    });

    name
}

public(package) fun validate_labels(labels: &vector<String>) {
    assert!(!labels.is_empty(), EInvalidName);

    labels.do_ref!(|label| assert!(is_valid_label(label), EInvalidName));
}

fun is_valid_label(label: &String): bool {
    let len = label.length();
    let label_bytes = label.as_bytes();
    let mut index = 0;

    if (len < 1 || len > constants::max_label_length!()) return false;

    while (index < len) {
        let character = label_bytes[index];
        let is_valid_character =
            (0x61 <= character && character <= 0x7A)                   // a-z
                || (0x30 <= character && character <= 0x39)                // 0-9
                || (character == 0x2D && index != 0 && index != len - 1); // '-' not at beginning or end

        if (!is_valid_character) {
            return false
        };

        index = index + 1;
    };

    true
}

/// A list of all known TLDs.
fun get_tld_symbol(tld: &String): String {
    if (tld == ns_constants::sui_tld()) return constants::sui_tld_separator!();
    abort EUnknownTLD
}

// /// Converts a TLD symbol to a TLD string.
// fun symbol_to_tld(symbol: &String): String {
//     if (symbol == constants::sui_tld_separator!()) {
//         return ns_constants::sui_tld()
//     };
//     abort EUnknownTLD
// }
