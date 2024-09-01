
/// The DotMove module is responsible for managing the ownership of `.move` names.
/// This is the "organization" structure layer in the .move service, and only gives the authorization to
/// the holder to create "apps" under this particular org.
/// 
/// This module couples the "DotMove" object with the "DotMoveRecord", to validate that these
/// can only be created / removed together (No way to create a `DotMove` without the equivalent DotMoveRecord).
module core::dot_move {
    use sui::clock::Clock;
    use core::name::Name;

    /// Tries to create or update a dotmove object with invalid expiration.
    const EInvalidExpirationTimestamp: u64 = 1;

    /// The `DotMove` struct represents ownership of a `.move` name.
    public struct DotMove has key, store {
        id: UID,
        name: Name,
        expiration_timestamp_ms: u64,
    }

    /// Creates a new `DotMove` object.
    /// 
    /// `DotMove` represents the ownership of an "Organization" name,
    /// and has an expiration date (must be renewed).
    /// 
    /// Different rules can apply on the creation / extension.
    /// 
    /// A `DotMove` and a `DotMoveRecord` are tightly coupled.
    /// There has to be a matching `DotMove` object for each `DotMoveRecord` entry.
    public(package) fun new(
        name: Name,
        expiration_timestamp_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ): DotMove {
        assert!(expiration_timestamp_ms > clock.timestamp_ms(), EInvalidExpirationTimestamp);

        DotMove {
            id: object::new(ctx),
            name,
            expiration_timestamp_ms,
        }
    }

    // Update the expiration timestamp of a `DotMove` object
    public(package) fun set_expiration_timestamp_ms(
        dot_move: &mut DotMove,
        expiration_timestamp_ms: u64,
        clock: &Clock
    ) {
        assert!(expiration_timestamp_ms > clock.timestamp_ms(), EInvalidExpirationTimestamp);
        dot_move.expiration_timestamp_ms = expiration_timestamp_ms;
    }

    /// Delete a `DotMove` object.
    public(package) fun burn(dot_move: DotMove) {
        let DotMove { id, name: _, expiration_timestamp_ms: _ } = dot_move;
        id.delete();
    }

    public fun has_expired(record: &DotMove, clock: &Clock): bool {
        clock.timestamp_ms() > record.expiration_timestamp_ms
    }

    public fun id(dot_move: &DotMove): ID {
        dot_move.id.to_inner()
    }

    public fun name(dot_move: &DotMove): Name {
        dot_move.name
    }
}
