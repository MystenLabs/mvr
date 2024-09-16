module mvr::constants;

use std::string::String;

/// Max networks that can be saved for a single app.
public macro fun max_networks(): u64 {
    25
}
/// The max length an app's label can be.
public macro fun max_label_length(): u64 {
    64
}
/// The separator between an org and an app.
public macro fun app_separator(): String {
    b"/".to_string()
}
/// Classic "." separator which is used in 3+ level domains.
public macro fun dot_separator(): String {
    b".".to_string()
}
/// The separator that replaces `.sui` with `@` (DOT formatting to AT
/// formatting).
public macro fun sui_tld_separator(): String {
    b"@".to_string()
}
