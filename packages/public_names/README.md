# MVR Public Names Package

This directory contains the `@mvr/public-names` package, enabling permissionless creation and registration of applications in the Move Registry (MVR) using SuiNS names.

You can find the latest addresses for this package and more information [in the docs page](https://docs.suins.io/move-registry).

## Overview

The `@mvr/public-names` package provides an interface for creating public names using SuiNS names. Public names allow anyone to register apps under the namespace. The core use case for this is the global @pkg name supported on MVR.

Each `PublicName` object stores a reference to the underlying NFT and grants a `PublicNameCap` capability to create apps tied to that identity. The package supports destruction of the public name, returning the original NFT.

> ⚠️ **Note:** Once a name is registered as a `PublicName`, the underlying NFT is locked and cannot be transferred until the `PublicName` is destroyed.

Key features include:

-   PublicName objects that represent ownership of a SuiNS name.
-   Registration of apps in MVR.
-   Proxy handling of SuiNS names.
-   Reclaim NFT by destroying the `PublicName` object.

## Installing

### [Move Registry CLI](https://docs.mvr.app/move-registry)

```bash
mvr add @mvr/public-names --network mainnet
```
