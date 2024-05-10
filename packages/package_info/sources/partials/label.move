
module package_info::label {
    use std::string::String;

    public struct Label has copy, store, drop {
        title: String,
        fontSize: u8
    }

    public fun new(title: String): Label {
        // TODO: add some custom logic to adjust the font size based on the length 
        // of the label on our SVG rendering.
        Label {
            title: title,
            fontSize: 65
        }
    }
}
