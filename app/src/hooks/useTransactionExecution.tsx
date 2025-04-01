// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useSignAndExecuteTransaction, useSignTransaction } from '@mysten/dapp-kit';
import { useState } from 'react';
import {toast} from 'sonner';
import { Transaction } from '@mysten/sui/transactions';
import { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { isValidSuiAddress, toBase64 } from '@mysten/sui/utils';
import { useMVRContext } from '@/components/providers/mvr-provider';
import { useSuiClientsContext } from '@/components/providers/client-provider';

export function useTransactionExecution(network: 'mainnet' | 'testnet') {
	const { isCustom, customAddress } = useMVRContext();
	const clients = useSuiClientsContext();
	const client = clients[network];

	const {mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

	const { mutateAsync: signTransaction } = useSignTransaction();
	const [txData, setTxData] = useState<string | undefined>(undefined);

	const reset = () => {
		setTxData(undefined);
	};

	const executeTransaction = async (
		tx: Transaction,
	): Promise<SuiTransactionBlockResponse | void> => {
		tx.addSerializationPlugin(clients.mvrPlugin[network]);
		if (!client) throw new Error("Client is not defined. Please refresh.");
		if (isCustom) {
			if (!customAddress || !isValidSuiAddress(customAddress)) {
				toast.error('Please define your multi-sig address');
				return;
			}

			tx.setSender(customAddress);

			const txData = toBase64(
				await tx.build({
					client,
				}),
			);

			setTxData(txData);
			return;
		}

		try {
			const digest = await signAndExecute({
				transaction: tx!,
				chain: network === 'mainnet' ? 'sui:mainnet' : 'sui:testnet',
			});

			await client.waitForTransaction({
				digest: digest.digest,
			});

			const res = await client.getTransactionBlock({
				digest: digest.digest,
				options: {
					showEffects: true,
					showObjectChanges: true,
				}
			});

			toast.success('Successfully executed transaction!');
			console.dir(res, { depth: null });
			return res;
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
