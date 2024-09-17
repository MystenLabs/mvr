module package_info::display_tests;

use package_info::display;

#[test]
fun test_display() {
    let mut display = display::new(
        b"E0E1EC".to_string(),
        b"BDBFEC".to_string(),
        b"Demo NFT".to_string(),
    );

    display.encode_label(@0x0.to_string());
}
