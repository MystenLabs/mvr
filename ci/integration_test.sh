#!/bin/bash
set -e

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

if ! command_exists curl; then
    echo "Error: curl is not installed. Please install curl and try again."
    exit 1
fi

##########################
# Add mvr binary to PATH #
##########################
MVR_PATH=$(find $(pwd)/mvr-cli/target/{debug,release} -type f -name "mvr" | head -n 1)
if [ -z "$MVR_PATH" ]; then
    echo "Error: mvr binary not found in mvr-cli/target/debug or mvr-cli/target/release. Please ensure it's built before running this script."
    exit 1
fi
export PATH=$PATH:$(dirname "$MVR_PATH")

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

###############################################
# Download and extract the latest sui release #
###############################################
echo "Downloading the latest Sui release..."
TEMP_DIR=$(mktemp -d)

# Use awk to extract the URL
LATEST_RELEASE_URL=$(curl -s https://api.github.com/repos/MystenLabs/sui/releases/latest | 
    awk -F'"' '/browser_download_url.*ubuntu-x86_64.tgz/ {print $4; exit}')

if [ -z "$LATEST_RELEASE_URL" ]; then
    echo "Error: Could not find the download URL for the latest Sui release."
    exit 1
fi

echo "Downloading from: $LATEST_RELEASE_URL"
curl -L -o "$TEMP_DIR/sui.tgz" "$LATEST_RELEASE_URL"

echo "Extracting the sui binary"
tar -xzvf "$TEMP_DIR/sui.tgz" -C "$TEMP_DIR"
SUI_BINARY=$(find "$TEMP_DIR" -type f -name "sui")

if [ -z "$SUI_BINARY" ]; then
    echo "Error: Sui binary not found in the extracted files."
    exit 1
fi

chmod +x "$SUI_BINARY"
export PATH=$PATH:$(dirname "$SUI_BINARY")
trap 'rm -rf "$TEMP_DIR"' EXIT

###########################################
# Invokes `mvr` when building the package #
###########################################
echo "Building package..."
cd demo-package
sui move build
