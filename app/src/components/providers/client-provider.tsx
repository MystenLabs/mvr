// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
'use client';

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { createContext, useContext } from 'react';

export type Clients = {
    mainnet: SuiClient;
    testnet: SuiClient;
    devnet: SuiClient;
    localnet: SuiClient;
};

export const DefaultClients: Clients = {
    mainnet: new SuiClient({ url: getFullnodeUrl('mainnet') }),
    testnet: new SuiClient({ url: getFullnodeUrl('testnet') }),
    devnet: new SuiClient({ url: getFullnodeUrl('devnet') }),
    localnet: new SuiClient({ url: getFullnodeUrl('localnet') })
};

export const SuiClientContext = createContext<Clients>(DefaultClients);

export function useSuiClientsContext() {
	return useContext(SuiClientContext);
}
