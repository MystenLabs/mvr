module core::registration {
    use std::string::String;
    use sui::clock::Clock;

    const YEAR_MS: u64 = 365 * 24 * 60 * 60 * 1000;

    use core::{
        name_registry::{Self, NameRegistry},
        dot_move::DotMove
    };

    public struct Registration has drop {}

    /// For now, we keep it extremely naive and just register the name for a year,
    /// without any payments involved, nor custom duration logic.
    public fun register(
        registry: &mut NameRegistry,
        name: String,
        clock: &Clock,
        ctx: &mut TxContext,
    ): DotMove {
        name_registry::add_record(registry, Registration {}, name, clock.timestamp_ms() + YEAR_MS, clock, ctx)
    }
}
