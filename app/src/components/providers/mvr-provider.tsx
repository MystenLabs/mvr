// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { createContext, useContext } from 'react';

export type MVRSetup = {
	isMultisig: boolean;
	multisigAddress: string | undefined;
	mainnetClient: SuiClient;
};

export const MVRContext = createContext<MVRSetup>({
	isMultisig: false,
	multisigAddress: undefined,
	mainnetClient: new SuiClient({ 
		url: getFullnodeUrl('mainnet') 
	}),
});

export function useMVRContext() {
	return useContext(MVRContext);
}
