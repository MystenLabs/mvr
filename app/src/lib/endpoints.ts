// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { env } from "@/env";

/**
 * Shared (server + client safe) endpoint constants.
 * Keep this file free of `"use client"` so server components, route handlers
 * and client hooks can all import it.
 */

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");

/** The canonical, public origin of the site (used for canonicals, OG, robots). */
export const SITE_URL = "https://www.moveregistry.com";

/**
 * MVR API base URLs. Overridable through `NEXT_PUBLIC_MVR_MAINNET_API_URL` /
 * `NEXT_PUBLIC_MVR_TESTNET_API_URL` (e.g. to point the app at a local API).
 */
export const MVR_ENDPOINTS = {
  mainnet: stripTrailingSlash(
    env.NEXT_PUBLIC_MVR_MAINNET_API_URL ?? "https://mainnet.mvr.mystenlabs.com",
  ),
  testnet: stripTrailingSlash(
    env.NEXT_PUBLIC_MVR_TESTNET_API_URL ?? "https://testnet.mvr.mystenlabs.com",
  ),
} as const;

export const MVR_EXPERIMENTAL_ENDPOINTS = {
  mainnet: "https://qa.mainnet.mvr.mystenlabs.com",
  testnet: "https://qa.testnet.mvr.mystenlabs.com",
} as const;
