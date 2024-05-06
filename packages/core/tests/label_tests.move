
module core::label_tests {
    use core::name;

    #[test]
    fun split_labels(){
        let mut name = b"package@org".to_string();
        let mut labels = name::split_by_separator(name);

        assert!(labels == vector[b"org".to_string(), b"package".to_string()], 0);
    }

    #[test]
    fun split_empty_labels() {
        let mut name = b"@@".to_string();
        let mut labels = name::split_by_separator(name);
        assert!(labels == vector[b"".to_string(), b"".to_string()], 0);
    }

    #[test]
    fun new_name(){
        let mut name = b"example@org".to_string();
        let name = name::new(name);
        
    }
}
