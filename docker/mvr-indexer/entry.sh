#!/bin/bash

export RUST_BACKTRACE=1
export RUST_LOG=debug

/opt/mysten/bin/tomato-indexer --remote-store-url "$REMOTE_STORE_URL" --database-url "$DB_URL"