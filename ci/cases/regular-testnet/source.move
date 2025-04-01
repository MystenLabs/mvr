module nftmaker::nftmaker;
use mvr_a::mvr_a;

public fun new() {
   mvr_a::noop_with_one_type_param<u64>()
}
