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
module nftmaker::nftmaker {
    use demo::demo;
    public fun new(): u64 {
      return demo::num()
    }
}
EOF

cat << EOF > demo-package/Move.toml
[package]
name = "nftmaker"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/mainnet" }
demo = { r.mvr = "@mvr-tst/first-app" }

[addresses]
nftmaker = "0x0"

[r.mvr]
network = "mainnet"
EOF

###########################################
# Invokes `mvr` when building the package #
###########################################
echo "Building package..."
cd demo-package
sui move build
