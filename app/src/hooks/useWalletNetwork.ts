// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount } from '@mysten/dapp-kit';

/** Returns the connected wallet's active network (mainnet, testnet, devnet, localnet) */
export function useWalletNetwork() {
	const account = useCurrentAccount();
	return account?.chains[0]?.replace('sui:', '') as 'mainnet' | 'testnet' | 'devnet' | 'localnet' | undefined;
}
