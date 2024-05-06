
module demo::demo {

    public struct DemoNFT has key, store {
        id: UID
    }

    public struct DemoWitness has drop {}
    public struct NestedDemoWitness<T: drop> has drop {}

    public fun new_nft(ctx: &mut TxContext): DemoNFT {
        DemoNFT { 
            id: object::new(ctx)
        }
    }

    public fun noop_w_type_param<T: drop>() {}
}
