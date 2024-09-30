// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
'use client';

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { KioskClient, Network } from "@mysten/kiosk";
import { createContext, useContext } from 'react';

export type Clients = {
    mainnet: SuiClient;
    testnet: SuiClient;
    devnet: SuiClient;
    localnet: SuiClient;
    mainnetKioskClient: KioskClient;
};

const mainnet = new SuiClient({ url: 'https://suins-rpc.mainnet.sui.io:443' });

export const DefaultClients: Clients = {
    mainnet,
    testnet: new SuiClient({ url: 'https://suins-rpc.testnet.sui.io:443' }),
    devnet: new SuiClient({ url: getFullnodeUrl('devnet') }),
    localnet: new SuiClient({ url: getFullnodeUrl('localnet') }),
    mainnetKioskClient: new KioskClient({
        client: mainnet,
        network: Network.MAINNET
    })
};

export const SuiClientContext = createContext<Clients>(DefaultClients);

export function useSuiClientsContext() {
	return useContext(SuiClientContext);
}
