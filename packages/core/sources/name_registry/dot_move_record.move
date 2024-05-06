module core::dot_move_record {
    use sui::clock::Clock;
    use core::dot_move::DotMove;

    const EInvalidExpirationTimestamp: u64 = 1;

    // The `DotMoveRecord` struct represents a record of a `DotMove` object.
    // This is saved on our on-chain registry to keep track of the expiration date 
    // and handle renewals, etc.
    //
    // We add `key` here in order to allow better upgradeability 
    // (e.g. by TTO or by attaching DFs), in future versions.
    public struct DotMoveRecord has key, store {
        id: UID,
        dot_move_id: ID,
        expiration_timestamp_ms: u64
    }

    public fun id(record: &DotMoveRecord): ID {
        record.id.to_inner()
    }

    public fun has_expired(record: &DotMoveRecord, clock: &Clock): bool {
        clock.timestamp_ms() > record.expiration_timestamp_ms
    }

    public fun is_valid_for(record: &DotMoveRecord, dot_move: &DotMove): bool {
        record.dot_move_id == dot_move.id()
    }

    /// Creates a new `DotMoveRecord` for a name.
    /// A `DotMove` and a `DotMoveRecord` should be tightly coupled.
    /// There has to be a matching `DotMove` object for each `DotMoveRecord` entry,
    /// so that's the reason we create the record in parallel with the DotMove object.
    public(package) fun new(
        expiration_timestamp_ms: u64,
        clock: &Clock,
        dot_move_id: ID,
        ctx: &mut TxContext,
    ): DotMoveRecord {
        assert!(expiration_timestamp_ms > clock.timestamp_ms(), EInvalidExpirationTimestamp);

        DotMoveRecord {
            id: object::new(ctx),
            dot_move_id,
            expiration_timestamp_ms,
        }
    }

    public(package) fun set_expiration_timestamp_ms(
        record: &mut DotMoveRecord, 
        expiration_timestamp_ms: u64, 
        clock: &Clock
    ) {
        assert!(expiration_timestamp_ms > clock.timestamp_ms(), EInvalidExpirationTimestamp);
        record.expiration_timestamp_ms = expiration_timestamp_ms;
    }

    /// Delete a `DotMoveRecord` object.
    public(package) fun burn(record: DotMoveRecord) {
        let DotMoveRecord { id, dot_move_id: _, expiration_timestamp_ms: _ } = record;
        id.delete();
    }
}
