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
import { useActiveAddress } from './useActiveAddress';

export function useTransactionExecution(network: 'mainnet' | 'testnet') {
	const { isCustom, customAddress } = useMVRContext();
	const clients = useSuiClientsContext();
	const client = clients[network];
	const activeAddress = useActiveAddress();

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
			if (!activeAddress) throw new Error('No connected wallet found. Please connect a wallet and try again.');
			tx.setSender(activeAddress);

			const signed = await signTransaction({
				transaction: toBase64(await tx.build({
					client,
				})),
				chain: network === 'mainnet' ? 'sui:mainnet' : 'sui:testnet',
			});

			const res = await client.executeTransactionBlock({
				transactionBlock: signed.bytes,
				signature: signed.signature,
				options: {
					showEffects: true,
					showObjectChanges: true,
				}
			});

			await client.waitForTransaction({
				digest: res.digest,
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
