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

const mainnet = new SuiClient({ url: "https://suins-rpc.mainnet.sui.io:443", network: 'mainnet' });

const testnetNamedPackagesPlugin = namedPackagesPlugin({
  url: 'https://testnet.mvr.mystenlabs.com'
});

const mainnetNamedPackagesPlugin = namedPackagesPlugin({
  url: 'https://mainnet.mvr.mystenlabs.com',
});

export const DefaultClients: Clients = {
  mainnet,
  testnet: new SuiClient({ url: "https://suins-rpc.testnet.sui.io:443", network: 'testnet' }),
  devnet: new SuiClient({ url: getFullnodeUrl("devnet"), network: 'devnet' }),
  localnet: new SuiClient({ url: getFullnodeUrl("localnet"), network: 'localnet' }),
  kiosk: {
    mainnet: new KioskClient({
      client: mainnet,
      network: Network.MAINNET,
    }),
  },
  graphql: {
    mainnet: new SuiGraphQLClient({
      url: "https://sui-mainnet.mystenlabs.com",
    }),
    testnet: new SuiGraphQLClient({
      url: "https://sui-testnet.mystenlabs.com",
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
