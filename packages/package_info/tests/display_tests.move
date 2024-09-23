module package_info::display_tests;

use package_info::display;

#[test]
fun test_display() {
    let mut display = display::new(
            b"Demo NFT".to_string(),
        b"E0E1EC".to_string(),
        b"BDBFEC".to_string(),
        b"030F1C".to_string(),
    );

    display.encode_label(@0x0.to_string());
}
