// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react';
import { toast } from 'sonner';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64, isValidSuiAddress, toBase64 } from '@mysten/sui/utils';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { useMVRContext } from '@/components/providers/mvr-provider';
import { useSuiClientsContext } from '@/components/providers/client-provider';
import { useActiveAddress } from './useActiveAddress';

export function useTransactionExecution(network: 'mainnet' | 'testnet') {
	const { isCustom, customAddress } = useMVRContext();
	const clients = useSuiClientsContext();
	const client = clients[network];
	const activeAddress = useActiveAddress();
	const dappKit = useDAppKit();

	const [txData, setTxData] = useState<string | undefined>(undefined);

	const reset = () => {
		setTxData(undefined);
	};

	const executeTransaction = async (tx: Transaction) => {
		if (!client) throw new Error("Client is not defined. Please refresh.");
		if (isCustom) {
			if (!customAddress || !isValidSuiAddress(customAddress)) {
				toast.error('Please define your multi-sig address');
				return;
			}

			tx.setSender(customAddress);

			const built = toBase64(
				await tx.build({
					client,
				}),
			);

			setTxData(built);
			return;
		}

		try {
			if (!activeAddress) throw new Error('No connected wallet found. Please connect a wallet and try again.');
			tx.setSender(activeAddress);

			const { bytes, signature } = await dappKit.signTransaction({
				transaction: tx,
				network,
			});

			const res = await client.core.executeTransaction({
				transaction: fromBase64(bytes),
				signatures: [signature],
				include: { effects: true },
			});

			if (res.$kind !== 'Transaction') {
				toast.error('Transaction failed to execute.');
				return;
			}

			await client.core.waitForTransaction({
				digest: res.Transaction.digest,
			});

			toast.success('Successfully executed transaction!');
			return res.Transaction;
		} catch (e: any) {
			toast.error(`Failed to execute transaction: ${e.message as string}`);
		}
	};

	return {
		executeTransaction,
		txData,
		reset,
	};
}
