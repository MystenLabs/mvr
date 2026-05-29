// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
"use client";

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { KioskClient, Network } from "@mysten/kiosk";
import { createContext, useContext } from "react";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import {
  namedPackagesPlugin,
  TransactionPlugin,
} from "@mysten/sui/transactions";

export type Clients = {
  mainnet: SuiClient;
  testnet: SuiClient;
  devnet: SuiClient;
  localnet: SuiClient;
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

// When set (the local demo stack — a localnet + the attestation demo server),
// ALL networks are pointed at it so the app does not depend on live Sui infra.
// Unset in production, where the per-network defaults apply.
// See ATTESTATION-INTEGRATION.md.
const LOCAL_RPC = process.env.NEXT_PUBLIC_LOCAL_RPC_URL;
const LOCAL_MVR = process.env.NEXT_PUBLIC_LOCAL_MVR_ENDPOINT;

const mainnet = new SuiClient({
  url: LOCAL_RPC ?? "https://suins-rpc.mainnet.sui.io:443",
  network: "mainnet",
});

export const DefaultClients: Clients = {
  mainnet,
  testnet: new SuiClient({
    url: LOCAL_RPC ?? "https://suins-rpc.testnet.sui.io",
    network: "testnet",
  }),
  devnet: new SuiClient({ url: getFullnodeUrl("devnet"), network: "devnet" }),
  localnet: new SuiClient({
    url: getFullnodeUrl("localnet"),
    network: "localnet",
  }),
  kiosk: {
    mainnet: new KioskClient({
      client: mainnet,
      network: Network.MAINNET,
    }),
  },
  graphql: {
    mainnet: new SuiGraphQLClient({
      url: "https://graphql.mainnet.sui.io/graphql",
    }),
    testnet: new SuiGraphQLClient({
      url: "https://graphql.testnet.sui.io/graphql",
    }),
  },
  mvrEndpoints: {
    mainnet: LOCAL_MVR ?? "https://mainnet.mvr.mystenlabs.com",
    testnet: LOCAL_MVR ?? "https://testnet.mvr.mystenlabs.com",
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
