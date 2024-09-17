module package_info::display;

use codec::urlencode;
use std::string::String;

/// Max length of a package name exceeded.
const EMaxNameLengthExceeded: u64 = 1;

// Max length of a package name. (4 lines x 17 characters)
const MAX_NAME_LENGTH: u64 = 68;
const CHARACTERS_PER_LINE: u64 = 17;
const SVG_X: u64 = 38;
const SVG_INITIAL_Y: u64 = 70;
const SVG_LINE_HEIGHT: u64 = 46;
const NAME_FONT_SIZE: u64 = 41;
const PACKAGE_FONT_SIZE: u64 = 18;
const DEFAULT_TEXT_COLOR: vector<u8> = b"030F1C";

public struct PackageDisplay has copy, store, drop {
    gradient_from: String,
    gradient_to: String,
    text_color: String,
    name: String,
    uri_encoded_name: String,
}

public fun new(
    gradient_from: String,
    gradient_to: String,
    name: String,
): PackageDisplay {
    assert!(name.length() <= MAX_NAME_LENGTH, EMaxNameLengthExceeded);
    PackageDisplay {
        gradient_from,
        gradient_to,
        name,
        text_color: DEFAULT_TEXT_COLOR.to_string(),
        // We keep empty for now. The uri encoding happens when we call
        // `encode_label`. That happens when `set_display` is called on
        // `PackageInfo`.
        uri_encoded_name: b"".to_string(),
    }
}

public fun default(name: String): PackageDisplay {
    new(
        b"E0E1EC".to_string(),
        b"BDBFEC".to_string(),
        name,
    )
}

public(package) fun encode_label(display: &mut PackageDisplay, id: String) {
    let name = display.name;
    let mut length_process = 0;
    let mut iterations = 0;

    let mut pre_encoded_name = b"".to_string();

    while (length_process < name.length()) {
        let initial = length_process;
        length_process = length_process + CHARACTERS_PER_LINE;

        if (length_process > name.length()) {
            length_process = name.length();
        };

        // now we need to get the parts and add them to the uri encoded string.
        // encoded_name.append(r)
        let part = name.substring(
            initial,
            length_process,
        );

        pre_encoded_name.append(
            new_text(
                part,
                SVG_X,
                SVG_INITIAL_Y + (iterations * SVG_LINE_HEIGHT),
                NAME_FONT_SIZE,
                display.text_color,
            ),
        );

        iterations = iterations + 1;
    };

    let mut formatted_id = b"0x".to_string();
    formatted_id.append(id.substring(0, 6));
    formatted_id.append(b"...".to_string());
    formatted_id.append(id.substring(id.length() - 6, id.length()));
    // Encode the ID of the package in the display.
    pre_encoded_name.append(
        new_text(
            formatted_id,
            SVG_X,
            SVG_INITIAL_Y + (iterations * SVG_LINE_HEIGHT),
            PACKAGE_FONT_SIZE,
            display.text_color,
        ),
    );

    display.uri_encoded_name = urlencode::encode(*pre_encoded_name.as_bytes());
}

fun new_text(
    part: String,
    x: u64,
    y: u64,
    font_size: u64,
    text_fill_color: String,
): String {
    let mut text = b"<text x='".to_string();
    text.append(x.to_string());
    text.append(b"' y='".to_string());
    text.append(y.to_string());
    text.append(b"' font-family='Roboto Mono, Courier, monospace' letter-spacing='0' font-weight='bold' font-size='".to_string());
    text.append(font_size.to_string());
    text.append(b"' fill='#".to_string());
    text.append(text_fill_color);
    text.append(b"'>".to_string());
    text.append(part);
    text.append(b"</text>".to_string());

    text
}
