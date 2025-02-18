#!/bin/bash
set -e

# Get the version number from Cargo.toml file
NEXT_VERSION=$(grep -m1 version crates/mvr-cli/Cargo.toml | sed 's/[^0-9.]*//g')

echo "Preparing to create release v$NEXT_VERSION"

# Check if the tag already exists
if git rev-parse "v$NEXT_VERSION" >/dev/null 2>&1; then
    echo "Tag v$NEXT_VERSION already exists. Check that Release v$NEXT_VERSION exists. It might be that Cargo.toml was not updated to the new upcoming version."
    exit 1
fi

git tag -a "v$NEXT_VERSION" -m "Release v$NEXT_VERSION"

echo "Tag v$NEXT_VERSION created successfully"

# Push the tag to the remote repository
git push origin "v$NEXT_VERSION"

echo "Tag v$NEXT_VERSION pushed to the remote repository"

echo "Release v$NEXT_VERSION created successfully"

# Bump the Cargo.toml version
echo "Please bump the version in the Cargo.toml file, commit, and push the commit!"
