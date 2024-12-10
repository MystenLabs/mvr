// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
"use client";

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { KioskClient, Network } from "@mysten/kiosk";
import { createContext, useContext } from "react";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { namedPackagesPlugin, TransactionPlugin } from "@mysten/sui/transactions";

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
  mvrPlugin: {
    mainnet: TransactionPlugin;
    testnet: TransactionPlugin;
  };
};

const mainnet = new SuiClient({ url: "https://suins-rpc.mainnet.sui.io:443" });

const testnetNamedPackagesPlugin = namedPackagesPlugin({
  suiGraphQLClient: new SuiGraphQLClient({
    url: 'https://mvr-rpc.sui-testnet.mystenlabs.com/graphql'
  })
});

const mainnetNamedPackagesPlugin = namedPackagesPlugin({
  suiGraphQLClient: new SuiGraphQLClient({
    url: 'https://mvr-rpc.sui-mainnet.mystenlabs.com/graphql'
  })
});

export const DefaultClients: Clients = {
  mainnet,
  testnet: new SuiClient({ url: "https://suins-rpc.testnet.sui.io:443" }),
  devnet: new SuiClient({ url: getFullnodeUrl("devnet") }),
  localnet: new SuiClient({ url: getFullnodeUrl("localnet") }),
  kiosk: {
    mainnet: new KioskClient({
      client: mainnet,
      network: Network.MAINNET,
    }),
  },
  graphql: {
    mainnet: new SuiGraphQLClient({
      url: "https://mvr-rpc.sui-mainnet.mystenlabs.com",
    }),
    testnet: new SuiGraphQLClient({
      url: "https://mvr-rpc.sui-testnet.mystenlabs.com",
    }),
  },
  mvrPlugin: {
    mainnet: mainnetNamedPackagesPlugin,
    testnet: testnetNamedPackagesPlugin,
  },
};

export const SuiClientContext = createContext<Clients>(DefaultClients);

export function useSuiClientsContext() {
  return useContext(SuiClientContext);
}
