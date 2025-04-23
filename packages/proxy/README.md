# MVR Subnames Proxy Package

This directory contains the `@mvr/subnames-proxy` package, a minimal utility used to proxy subdomain-based registrations into the Move Registry (MVR).

You can find the latest addresses for this package and more information [in the docs page](https://docs.suins.io/move-registry).

## Overview

The `@mvr/subnames-proxy` package provides a thin wrapper that enables registering applications using `SubDomainRegistration` objects from SuiNS. This allows subdomains to seamlessly create app records in the Move Registry.

This package simply forwards the subdomain registration to the `MoveRegistry`.

Intended for integration scenarios where subdomains are used for app registration.

## Modules

utils: A module with a single `register` function. It proxies a call to `MoveRegistry::register` using a `SubDomainRegistration` NFT and creates an `AppCap` for the new app.

## Installing

### [Move Registry CLI](https://docs.mvr.app/move-registry)

```bash
mvr add @mvr/subnames-proxy --network testnet

# or for mainnet
mvr add @mvr/subnames-proxy --network mainnet
```
