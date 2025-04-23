# MVR Core Package

This directory contains the main `@mvr/core` package, which powers the Move Registry (MVR).

You can find more information [in the docs page](https://docs.suins.io/move-registry).

## Overview

The `@mvr/core` Package is the foundational component of the Move Registry, providing essential on-chain functionality for application registration and resolution in the Sui ecosystem. It enables developers and protocols to register human-readable application names under organizations, assign immutable package details, and manage metadata and multichain deployment references.

## Modules

app_cap_display: Handles SVG-based rendering and URI-encoding of visual metadata for AppCaps. Supports stylized name displays based on immutability status.

app_info: A lightweight struct representing app-level package data, including the package address, `UpgradeCap`, and optional info ID.

app_record: Defines the structure and lifecycle of an AppRecord, which includes metadata, storage, and cross-network info. Handles app immutability, metadata management, and deletion logic.

constants: Contains macro-defined constants such as maximum label lengths, valid separators, and network limits used across the registry.

move_registry: The core registry module managing the lifecycle of app registrations. Supports registering and removing apps, assigning packages, managing cross-network data, and version control. Enforces immutability once a package is attached.

name: Implements typed parsing and validation of `@suins-name/app` formatted names. Provides conversions to and from SuiNS `Domain` objects, label validation, and string utilities.

## Installing

### [Move Registry CLI](https://docs.mvr.app/move-registry)

```bash
mvr add @mvr/core --network testnet

# or for mainnet
mvr add @mvr/core --network mainnet
```
