// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
"use client";

import { SuiGrpcClient } from "@mysten/sui/grpc";
import { KioskClient } from "@mysten/kiosk";
import { createContext, useContext } from "react";
import { SuiGraphQLClient } from "@mysten/sui/graphql";

export type Clients = {
  mainnet: SuiGrpcClient;
  testnet: SuiGrpcClient;
  devnet: SuiGrpcClient;
  localnet: SuiGrpcClient;
  kiosk: {
    mainnet: KioskClient;
  };
  graphql: {
    mainnet: SuiGraphQLClient;
    testnet: SuiGraphQLClient;
  };
  mvrEndpoints: {
    mainnet: string;
    testnet: string;
  };
  mvrExperimentalEndpoints: {
    mainnet: string;
    testnet: string;
  };
};

// gRPC (gRPC-web) full node endpoints. Swap to a preferred / higher-rate-limit
// gRPC endpoint if needed.
const GRPC_URLS = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
  localnet: "http://127.0.0.1:9000",
};

const MVR_ENDPOINTS = {
  mainnet: "https://mainnet.mvr.mystenlabs.com",
  testnet: "https://testnet.mvr.mystenlabs.com",
};

// When set (the local demo stack — a localnet + the attestation demo server),
// ALL networks are pointed at it so the app does not depend on live Sui infra.
// NEXT_PUBLIC_LOCAL_RPC_URL now holds the localnet *gRPC* base URL (the JSON-RPC
// port is gone post-migration). Unset in production, where the per-network
// defaults apply. See ATTESTATION-INTEGRATION.md.
const LOCAL_GRPC = process.env.NEXT_PUBLIC_LOCAL_RPC_URL;
const LOCAL_MVR = process.env.NEXT_PUBLIC_LOCAL_MVR_ENDPOINT;
const LOCAL_GRAPHQL = process.env.NEXT_PUBLIC_LOCAL_GRAPHQL;

// gRPC clients resolve `@mvr/...` named packages during transaction building via
// the `mvr` option (replaces the old `namedPackagesPlugin`).
const mainnet = new SuiGrpcClient({
  network: "mainnet",
  baseUrl: LOCAL_GRPC ?? GRPC_URLS.mainnet,
  mvr: { url: LOCAL_MVR ?? MVR_ENDPOINTS.mainnet },
});

const mainnetGraphql = new SuiGraphQLClient({
  url: LOCAL_GRAPHQL ?? "https://graphql.mainnet.sui.io/graphql",
  network: "mainnet",
});

export const DefaultClients: Clients = {
  mainnet,
  testnet: new SuiGrpcClient({
    network: "testnet",
    baseUrl: LOCAL_GRPC ?? GRPC_URLS.testnet,
    mvr: { url: LOCAL_MVR ?? MVR_ENDPOINTS.testnet },
  }),
  devnet: new SuiGrpcClient({
    network: "devnet",
    baseUrl: LOCAL_GRPC ?? GRPC_URLS.devnet,
  }),
  localnet: new SuiGrpcClient({
    network: "localnet",
    baseUrl: LOCAL_GRPC ?? GRPC_URLS.localnet,
  }),
  kiosk: {
    // kiosk 1.x's KioskCompatibleClient is JSON-RPC | GraphQL (not gRPC), so the
    // kiosk client rides on the GraphQL transport.
    mainnet: new KioskClient({
      client: mainnetGraphql,
      network: "mainnet",
    }),
  },
  graphql: {
    mainnet: mainnetGraphql,
    testnet: new SuiGraphQLClient({
      url: LOCAL_GRAPHQL ?? "https://graphql.testnet.sui.io/graphql",
      network: "testnet",
    }),
  },
  mvrEndpoints: {
    mainnet: LOCAL_MVR ?? MVR_ENDPOINTS.mainnet,
    testnet: LOCAL_MVR ?? MVR_ENDPOINTS.testnet,
  },
  mvrExperimentalEndpoints: {
    mainnet: LOCAL_MVR ?? "https://qa.mainnet.mvr.mystenlabs.com",
    testnet: LOCAL_MVR ?? "https://qa.testnet.mvr.mystenlabs.com",
  },
};

export const SuiClientContext = createContext<Clients>(DefaultClients);

export function useSuiClientsContext() {
  return useContext(SuiClientContext);
}
