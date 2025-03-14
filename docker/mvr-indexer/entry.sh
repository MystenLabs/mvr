#!/bin/bash

export RUST_BACKTRACE=1
export RUST_LOG=debug

/opt/mysten/bin/mvr-indexer --database-url "$DB_URL" --env "$NETWORK"
