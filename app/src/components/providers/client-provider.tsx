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

// The mainnet RPC and MVR endpoint can be overridden via env so the app can
// be pointed at a local stack (e.g. a localnet + the attestation demo server)
// without code changes. Unset in production, where the defaults apply.
const MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? "https://suins-rpc.mainnet.sui.io:443";
const MAINNET_MVR_ENDPOINT =
  process.env.NEXT_PUBLIC_MAINNET_MVR_ENDPOINT ?? "https://mainnet.mvr.mystenlabs.com";

const mainnet = new SuiClient({
  url: MAINNET_RPC_URL,
  network: "mainnet",
});

export const DefaultClients: Clients = {
  mainnet,
  testnet: new SuiClient({
    url: "https://suins-rpc.testnet.sui.io",
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
    mainnet: MAINNET_MVR_ENDPOINT,
    testnet: "https://testnet.mvr.mystenlabs.com",
  },
  mvrExperimentalEndpoints: {
    mainnet: "https://qa.mainnet.mvr.mystenlabs.com",
    testnet: "https://qa.testnet.mvr.mystenlabs.com",
  },
};

export const SuiClientContext = createContext<Clients>(DefaultClients);

export function useSuiClientsContext() {
  return useContext(SuiClientContext);
}
