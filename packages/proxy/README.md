# MVR Subnames Proxy Package

This directory contains the `@mvr/subnames-proxy` package, a minimal utility used to proxy subdomain-based registrations into the Move Registry (MVR).

You can find the latest addresses for this package and more information [in the docs page](https://docs.suins.io/move-registry).

## Overview

The `@mvr/subnames-proxy` package provides a thin wrapper that enables registering applications using SuiNS subnames. This allows subdomains to create app records in the Move Registry.

Intended for integration scenarios where subdomains are used for app registration.

## Installing

### [Move Registry CLI](https://docs.mvr.app/move-registry)

```bash
mvr add @mvr/subnames-proxy --network mainnet
```
