# MVR Public Names Package

This directory contains the `@mvr/public-names` package, enabling permissionless creation and registration of applications in the Move Registry (MVR) using SuiNS names.

You can find the latest addresses for this package and more information [in the docs page](https://docs.suins.io/move-registry).

## Overview

The `@mvr/public-names` package provides an open interface for creating and managing public names, which can be backed by either a `SuinsRegistration` or a `SubDomainRegistration` NFT. These public names can then be used to register apps in the MVR registry in a permissionless manner.

Each `PublicName` object stores a reference to the underlying NFT and grants the caller a `PublicNameCap` capability to create apps tied to that identity. The package supports clean destruction of the public name, safely returning the original NFT to the caller.

> ⚠️ **Note:** Once a name is registered as a `PublicName`, the underlying NFT is locked and cannot be transferred until the `PublicName` is destroyed.

Key features include:

-   PublicName objects that represent ownership of a domain or subdomain.
-   Capability-gated registration of apps in MVR.
-   Proxy handling of both top level and subdomain SuiNS NFTs.
-   Secure NFT reclamation via `destroy`.

## Installing

### [Move Registry CLI](https://docs.mvr.app/move-registry)

```bash
mvr add @mvr/public-names --network testnet

# or for mainnet
mvr add @mvr/public-names --network mainnet
```
