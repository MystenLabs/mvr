/// Our names have a fixed style, which is created in the format `@org/app`.
/// Versioning can be used only on the RPC layer to determine a fixed package
/// version (e.g @org/app?v1)).
///
/// The only restrictions that apply to a label are:
/// - It must be up to 64 characters per label
/// - It can only contain alphanumeric characters, in lower case, and dashes
/// (singular, not in the beginning or end)
module mvr::app;

use mvr::constants;
use std::string::String;
use suins::constants as ns_constants;
use suins::domain::Domain;
use suins::suins_registration::SuinsRegistration;

const EInvalidName: u64 = 1;
const ENotAnApp: u64 = 2;
const EUnknownTLD: u64 = 3;

/// A name format is `@org/app`
/// We keep "org" part flexible, in a future world where SuiNS subdomains could
/// also be nested.
/// So `example@org/app` would also be valid, and `inner.example@org/app` would
/// also be valid.
public struct App has copy, store, drop {
    /// The ORG part of the name is a SuiNS Domain.
    org: Domain,
    /// The APP part of the name. We keep it as a vector, even though it'll
    /// always be a single element.
    /// That allows us to extend the name further in the future.
    app: vector<String>,
}

/// Creates a new `App`.
public fun new(app: String, org: Domain): App {
    // validate that our app is a valid label.
    validate_labels(&vector[app]);

    App {
        org,
        app: vector[app],
    }
}

/// Validates that the `Org` part
public fun has_valid_org(name: &App, org: &SuinsRegistration): bool {
    name.org == org.domain()
}

/// Get the `app` from an `App`.
/// E.g. `@org/example` returns `example`
public fun app(app: &App): &String {
    assert!(app.app.length() == 1, ENotAnApp);
    &app.app[0]
}

/// Converts an `App` to its string representation (e.g. `@org/app`,
/// `inner@org/app`)
public fun to_string(app: &App): String {
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

    // now we process the app part.
    // we add the `/` separator
    name.append(constants::app_separator!());

    // now we process the app parts.
    let app_labels = app.app;
    let mut labels_len = app_labels.length();

    app_labels.do!(|label| {
        labels_len = labels_len - 1;
        name.append(label);
        if (labels_len > 0) name.append(constants::dot_separator!());
    });

    name
}

/// TODO: implement
// public fun from_string(name: String): App { }

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

/// Converts a TLD symbol to a TLD string.
fun symbol_to_tld(symbol: &String): String {
    if (symbol == constants::sui_tld_separator!()) {
        return ns_constants::sui_tld()
    };
    abort EUnknownTLD
}
