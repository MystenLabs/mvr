#!/bin/bash
set -e

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

if ! command_exists curl; then
    echo "Error: curl is not installed. Please install curl and try again."
    exit 1
fi

##########################################################
# Demo Package set up (depends on on-chain package data) #
##########################################################
mkdir -p demo-package/sources

cat << EOF > demo-package/sources/demo.move
module nftmaker::nftmaker;
use demo::demo;

public fun new(): u64 {
    return demo::num()
}
EOF

cat << EOF > demo-package/Move.toml
[package]
name = "nftmaker"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/mainnet" }

[addresses]
nftmaker = "0x0"

EOF

### Expected Move.toml file after adding the dependency
cat << EOF > demo-package/expected_move.toml
[package]
name = "nftmaker"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/mainnet" }
demo = { r.mvr = "@mvr/demo" }
upgraded = { r.mvr = "@testingafreeclaim/upgraded" }
mvr_a = { r.mvr = "@pkg/qwer" }

[addresses]
nftmaker = "0x0"

[r.mvr]
network = "mainnet"

EOF

### Add package dependency via mvr add command
cd demo-package && mvr add @mvr/demo --network mainnet && cd ..

# Add a dependency which has more than 1 versions (and rely on the latest).
cd demo-package && mvr add @testingafreeclaim/upgraded --network mainnet && cd ..
cd demo-package && mvr add @pkg/qwer --network mainnet && cd ..

### Check if the expected Move.toml file and the generated one are the same
if ! diff -u demo-package/expected_move.toml demo-package/Move.toml > /dev/null; then
  echo "ERROR: after adding package dependency via \"mvr add\" command, the Move.toml file is not as expected."
  exit 1
fi

###########################################
# Invokes `mvr` when building the package #
###########################################
echo "Building package..."
cd demo-package
sui move build

