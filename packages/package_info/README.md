# MVR Metadata Package

This directory contains the `@mvr/metadata` package, which manages rich metadata and versioning information for packages within the Move Registry (MVR).

You can find the latest addresses for this package and more information [in the docs page](https://docs.suins.io/move-registry).

## Overview

The `@mvr/metadata` package defines `PackageInfo` objects, which are metadata associated with registered Move packages. These objects track upgrade capabilities, package addresses, Git versioning metadata, and on-chain display configuration.

Key features include:

-   Metadata tracking and editing for Move packages.
-   Immutable link to package address and upgrade cap.
-   On-chain display and SVG generation.
-   Git version tagging for source validation and development use.

`PackageInfo` objects are intended to be indexed and owned, making them easily queryable and secure for long-term metadata tracking.

## Installing

### [Move Registry CLI](https://docs.mvr.app/move-registry)

```bash
mvr add @mvr/metadata --network testnet

# or for mainnet
mvr add @mvr/metadata --network mainnet
```
