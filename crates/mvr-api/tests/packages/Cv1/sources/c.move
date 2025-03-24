// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module c::c {
    public struct C {
        x: u64
    }

    public struct WPhantomTypeParam<phantom T> {
        x: u64
    }

    public struct WTypeParam<T: store> {
        x: u64,
        t: T
    }

    public fun c(): u64 {
        42
    }
}
