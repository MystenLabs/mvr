
/// The custom Display struct is used to store the colors for the display.
/// The colors are stored as hex strings, without the `#` in front.
module package_info::style {
    use std::string::String;

    public struct Style has copy, store, drop {
        background_color: String,
        title_color: String,
        package_color: String,
    }

    public fun new(
        background_color: String, 
        title_color: String, 
        package_color: String
    ): Style {
        Style {
            background_color: background_color,
            title_color: title_color,
            package_color: package_color,
        }
    }

    // Default display is the blue-ish style.
    public fun default(): Style {
        new(b"CDE7FF".to_string(), b"000f1c".to_string(), b"00427f".to_string())
    }
}
