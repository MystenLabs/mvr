module nftmaker::nftmaker;
use demo::demo;

public fun new(): u64 {
    return demo::num()
}
