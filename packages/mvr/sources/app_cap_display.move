module mvr::app_cap_display;

use codec::urlencode;
use mvr::name::Name;
use std::string::String;

/// Canvas setup
const X_POS: u64 = 20;
const INITIAL_Y: u64 = 30;

/// Org specific setup
const ORG_TEXT_SIZE: u64 = 10;
const ORG_TEXT_COLOR: vector<u8> = b"E0E1EC";
const ORG_CHARACTERS_PER_LINE: u64 = 32;
const ORG_LINE_HEIGHT: u64 = 12;

/// App specific setup
const APP_TEXT_COLOR: vector<u8> = b"BDBFEC";
const APP_TEXT_SIZE: u64 = 23;
const APP_CHARACTERS_PER_LINE: u64 = 16;
const APP_LINE_HEIGHT: u64 = 23;

public struct AppCapDisplay has copy, store, drop {
    link_opacity: u8, // 0 if not immutable / 1 if immutable.
    uri_encoded_text: String, // SVG URI encoded text
}

public(package) fun new(name: Name, is_immutable: bool): AppCapDisplay {
    let link_opacity = if (is_immutable) {
        100
    } else {
        0
    };

    let display = AppCapDisplay {
        link_opacity,
        uri_encoded_text: uri_encode_text(name),
    };

    display
}

public(package) fun set_link_opacity(
    display: &mut AppCapDisplay,
    is_immutable: bool,
) {
    let link_opacity = if (is_immutable) {
        100
    } else {
        0
    };
    display.link_opacity = link_opacity;
}

public(package) fun uri_encode_text(name: Name): String {
    let mut pre_encoded_name = b"".to_string();
    let mut y = INITIAL_Y;

    let (partial, next_y) = render_batch(
        name.app_to_string(),
        APP_CHARACTERS_PER_LINE,
        y,
        APP_TEXT_SIZE,
        APP_LINE_HEIGHT,
        APP_TEXT_COLOR.to_string(),
    );

    pre_encoded_name.append(partial);
    y = next_y;

    let (partial, _) = render_batch(
        name.org_to_string(),
        ORG_CHARACTERS_PER_LINE,
        y,
        ORG_TEXT_SIZE,
        ORG_LINE_HEIGHT,
        ORG_TEXT_COLOR.to_string(),
    );

    pre_encoded_name.append(partial);

    urlencode::encode(*pre_encoded_name.as_bytes())
}

fun render_batch(
    part: String,
    characters_per_line: u64,
    initial_y: u64,
    font_size: u64,
    line_height: u64,
    color_hex: String,
): (String, u64) {
    let mut pre_encoded_part = b"".to_string();
    let mut i = 0;
    let mut y = initial_y;

    while (i < part.length()) {
        let initial = i;
        i = i + characters_per_line;

        if (i > part.length()) {
            i = part.length()
        };

        let render = part.substring(initial, i);

        pre_encoded_part.append(
            new_svg_text(
                render,
                X_POS,
                y,
                font_size,
                color_hex,
            ),
        );

        y = y + line_height;
    };

    (pre_encoded_part, y)
}

/// Helper function to create a new SVG text element based on our custom display
/// system.
fun new_svg_text(
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
    text.append(b"' font-family='Roboto Mono, Courier, monospace' letter-spacing='0' font-size='".to_string());
    text.append(font_size.to_string());
    text.append(b"' fill='#".to_string());
    text.append(text_fill_color);
    text.append(b"'>".to_string());
    text.append(part);
    text.append(b"</text>".to_string());

    text
}
