# MVR Metadata Package

This directory contains the `@mvr/metadata` package, which manages rich metadata and versioning information for packages within the Move Registry (MVR).

You can find the latest addresses for this package and more information [in the docs page](https://docs.suins.io/move-registry).

## Overview

The `@mvr/metadata` package defines the structure and behavior of `PackageInfo` objects, which are metadata containers associated with registered Move packages. These objects track upgrade capabilities, package addresses, Git versioning metadata, and on-chain display configuration. This module ensures that metadata and version control can be seamlessly managed in a decentralized and upgrade-safe manner.

Key features include:

-   Metadata tracking and editing for Move packages.
-   Immutable link to package address and upgrade cap.
-   On-chain display configuration and SVG generation.
-   Git version tagging for source validation and development use.
-   Support for arbitrary dynamic fields for extensibility.

`PackageInfo` objects are intended to be indexed and owned, making them easily queryable and secure for long-term metadata tracking.

## Modules

package_info: Defines the `PackageInfo` object and its associated functions. Supports setting and removing display data, version metadata (e.g. Git tags/shas), plain-text metadata, and custom dynamic fields. Includes validation logic for versioning safety and upgrade security.

## Installing

### [Move Registry CLI](https://docs.mvr.app/move-registry)

```bash
mvr add @mvr/metadata --network testnet

# or for mainnet
mvr add @mvr/metadata --network mainnet
```
