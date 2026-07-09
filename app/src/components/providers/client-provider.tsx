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
// gRPC endpoint if needed (the previous JSON-RPC setup pointed at suins-rpc.*.sui.io).
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

// gRPC clients resolve `@mvr/...` named packages during transaction building via
// the `mvr` option (replaces the old `namedPackagesPlugin`).
const mainnet = new SuiGrpcClient({
  network: "mainnet",
  baseUrl: GRPC_URLS.mainnet,
  mvr: { url: MVR_ENDPOINTS.mainnet },
});

const mainnetGraphql = new SuiGraphQLClient({
  url: "https://graphql.mainnet.sui.io/graphql",
  network: "mainnet",
});

export const DefaultClients: Clients = {
  mainnet,
  testnet: new SuiGrpcClient({
    network: "testnet",
    baseUrl: GRPC_URLS.testnet,
    mvr: { url: MVR_ENDPOINTS.testnet },
  }),
  devnet: new SuiGrpcClient({ network: "devnet", baseUrl: GRPC_URLS.devnet }),
  localnet: new SuiGrpcClient({
    network: "localnet",
    baseUrl: GRPC_URLS.localnet,
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
      url: "https://graphql.testnet.sui.io/graphql",
      network: "testnet",
    }),
  },
  mvrEndpoints: MVR_ENDPOINTS,
  mvrExperimentalEndpoints: {
    mainnet: "https://qa.mainnet.mvr.mystenlabs.com",
    testnet: "https://qa.testnet.mvr.mystenlabs.com",
  },
};

export const SuiClientContext = createContext<Clients>(DefaultClients);

export function useSuiClientsContext() {
  return useContext(SuiClientContext);
}
