# MVR Core Package

This directory contains the main `@mvr/core` package, which powers the Move Registry (MVR).

You can find more information [in the docs page](https://docs.suins.io/move-registry).

## Overview

The `@mvr/core` package is the foundational component of the Move Registry (MVR, pronounced "mover"). It provides essential functionality for application registration and resolution in the Sui ecosystem.

MVR allows developers and protocols to:

-   Register human-readable application names under SuiNS.
-   Assign immutable package metadata and other details.
-   Reference Move packages and types by name in programmable transaction blocks (PTBs), abstracting away direct address usage.
-   Manage multichain deployment references and package versioning across networks.

> ⚠️ **Note:** MVR can be used on both **mainnet** and **testnet**, but **mainnet is the source of truth** for resolving packages. Updates to registry entries can only be made on mainnet.

## Why Use MVR?

-   **Readable and maintainable Move code:** Reference named packages/types in PTBs.
-   **Simplified dependency management:** Depend on packages by name, not address.
-   **Automated version resolution:** If no version is specified, MVR resolves to the latest version.
-   **Network abstraction:** Develop without hardcoding package addresses, enabling smoother multi-network support.

## Example

Before MVR:

```typescript
transaction.moveCall({
    target: `0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54::module::function`,
});
```

After MVR:

```typescript
transaction.moveCall({
    target: `@mvr/core::module::function`,
});
```

For more MVR onboarding details, please refer to the [docs](https://docs.suins.io/move-registry).

## Installing

### [Move Registry CLI](https://docs.mvr.app/move-registry)

# or for mainnet

mvr add @mvr/core --network mainnet

```

```
