/// Used to register the core package.
module core::core{
    use sui::package;

    public struct CORE has drop {}

    fun init(otw: CORE, ctx: &mut TxContext) {
        package::claim_and_keep(otw, ctx)
    }
}
