
/// This is the first of the two core registries for .move.
/// It holds all the "Organization" names (first level) for .move service, and allows
/// attaching second party apps to it.
module core::name_registry {
    use std::string::String;

    use sui::{
        table::{Self, Table},
        balance::{Self, Balance},
        sui::SUI,
        dynamic_field::{Self as df},
        coin::Coin,
        clock::Clock,
    };

    use core::{
        dot_move::{Self, DotMove},
        dot_move_record::{Self, DotMoveRecord}
    };

    /// Errors
    const ERecordNotExpired: u64 = 1;
    const EInvalidVersion: u64 = 2;
    const EUnauthorizedApp: u64 = 3;
    const ERecordNotExists: u64 = 4;
    const EIdMissMatch: u64 = 5;

    /// The version of the `NameRegistry`.
    const VERSION: u16 = 1;

    /// The Key to authenticate an app to the `NameRegistry`.
    public struct AuthorizedApp<phantom T: drop> has copy, store, drop {}

    /// The `NameRegistry` holds all the "Organization" names (first level) for .move service.
    /// Also holds all balances from sales of these names, and allows third party apps to be attached to it.
    public struct NameRegistry has key {
        id: UID,
        balance: Balance<SUI>,
        version: u16,
        registry: Table<String, DotMoveRecord>,
    }

    /// The Capability for privileged access to the` NameRegistry`.
    public struct NameRegistryCap has key, store {
        id: UID
    }

    /// The capability for withdrawing funds from the `NameRegistry`.
    public struct FinancialCap has key, store {
        id: UID
    }

    /// On init, we create the Registry and the Capability for it.
    fun init(ctx: &mut TxContext) {
        let registry = NameRegistry {
            id: object::new(ctx),
            registry: table::new(ctx),
            balance: balance::zero(),
            version: VERSION
        };

        transfer::public_transfer(NameRegistryCap { id: object::new(ctx) }, ctx.sender());
        transfer::share_object(registry);
    }

    /// Add a new `.move` name in the registry
    public fun add_record<T: drop>(
        registry: &mut NameRegistry, 
        _: T, 
        clock: &Clock, 
        name: String, 
        expiration_timestamp_ms: u64, 
        ctx: &mut TxContext
    ): DotMove {
        assert!(registry.is_app_authorized<T>(), EUnauthorizedApp);
        assert!(registry.is_valid_version(), EInvalidVersion);

        // If the current record exists and has expired, remove from registry.
        registry.remove_record_if_exists_and_expired(name, clock);

        let dot_move = dot_move::new(name, expiration_timestamp_ms, clock, ctx);
        let record = dot_move_record::new(name, expiration_timestamp_ms, clock, dot_move.id(), ctx);

        registry.registry.add(name, record);
        dot_move
    }

    /// Remove a record. Only from authorized apps. 
    /// Can only remove if name expiration has elapsed.
    public fun burn<T: drop>(
        registry: &mut NameRegistry, 
        _: T,
        dot_move: DotMove,
        clock: &Clock
    ) {
        assert!(registry.is_app_authorized<T>(), EUnauthorizedApp);
        assert!(registry.is_valid_version(), EInvalidVersion);

        assert!(dot_move.has_expired(clock), ERecordNotExpired);

        let record = registry.registry.borrow(dot_move.name());

        if (record.is_valid_for(&dot_move)) {
            let deletion = registry.registry.remove(dot_move.name());
            deletion.burn();
        };

        dot_move.burn();
    }
    
    /// Extend the expiration of a record. 
    /// Only callable from an authorized app and for valid combinations.
    public fun extend_expiration<T: drop>(
        registry: &mut NameRegistry, 
        _: T,
        dot_move: &mut DotMove,
        expiration_timestamp_ms: u64,
        clock: &Clock,
    ) {
        assert!(registry.is_app_authorized<T>(), EUnauthorizedApp);
        assert!(registry.is_valid_version(), EInvalidVersion);
        assert!(registry.registry.contains(dot_move.name()), ERecordNotExists);

        let record = registry.registry.borrow_mut(dot_move.name());
        assert!(record.is_valid_for(dot_move), EIdMissMatch);

        // We always update both the record + the NFT.
        record.set_expiration_timestamp_ms(expiration_timestamp_ms, clock);
        dot_move.set_expiration_timestamp_ms(expiration_timestamp_ms, clock);
    }


    fun remove_record_if_exists_and_expired(
        registry: &mut NameRegistry,
        name: String,
        clock: &Clock
    ) {
        if (!registry.registry.contains(name)) {
            return
        };

        let record = registry.registry.remove(name);
        assert!(record.has_expired(clock), ERecordNotExpired);

        // destroy the record object.
        record.burn();
    }

    public fun is_app_authorized<T: drop>(registry: &NameRegistry): bool {
        df::exists_(&registry.id, AuthorizedApp<T> {})
    }

    fun is_valid_version(registry: &NameRegistry): bool {
        registry.version == VERSION
    }

    /// Cap-based functionality

    /// A public withdraw function only callable from the `FinancialCap` holder.
    public fun withdraw(
        registry: &mut NameRegistry,
        _: &FinancialCap,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        registry.balance.withdraw_all().into_coin(ctx)
    }

    /// This function allows to add a new organization to the registry.
    public fun authorize_app<T: drop>(
        registry: &mut NameRegistry,
        _: &NameRegistryCap,
    ) {
        df::add(&mut registry.id, AuthorizedApp<T> {}, true);
    }

    /// Allows deauthorizing an app as an admin of the registry.
    public fun deauthorize_app<T: drop>(
        registry: &mut NameRegistry,
        _: &NameRegistryCap,
    ) {
        df::remove<AuthorizedApp<T>, bool>(&mut registry.id, AuthorizedApp<T> {});
    }
}
