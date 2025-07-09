#!/bin/bash

export RUST_BACKTRACE=1
export RUST_LOG=debug

# for initdb
export PATH="/usr/lib/postgresql/$(ls /usr/lib/postgresql | head -n 1)/bin:$PATH"
export RUSTFLAGS="--cfg tokio_unstable"
export TOKIO_CONSOLE=1

/opt/mysten/bin/mvr-indexer --database-url "$DB_URL" --env "$NETWORK"
