// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useSignTransaction } from '@mysten/dapp-kit';
import { useState } from 'react';
import {toast} from 'sonner';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { isValidSuiAddress, toB64 } from '@mysten/sui/utils';
import { useMVRContext } from '@/components/providers/mvr-provider';
import { useSuiClientsContext } from '@/components/providers/client-provider';

export function useTransactionExecution(network: 'mainnet' | 'testnet') {
	const { isCustom, customAddress } = useMVRContext();
	const clients = useSuiClientsContext();
	const client = clients[network];

	// register the plugin based on the selected network.
	Transaction.registerGlobalSerializationPlugin('namedPackagesPlugin', clients.mvrPlugin[network]);


	const { mutateAsync: signTransaction } = useSignTransaction();
	const [txData, setTxData] = useState<string | undefined>(undefined);

	const reset = () => {
		setTxData(undefined);
	};

	const executeTransaction = async (
		tx: Transaction,
	): Promise<SuiTransactionBlockResponse | void> => {
		if (!client) throw new Error("Client is not defined. Please refresh.");
		if (isCustom) {
			if (!customAddress || !isValidSuiAddress(customAddress)) {
				toast.error('Please define your multi-sig address');
				return;
			}

			tx.setSender(customAddress);

			const txData = toB64(
				await tx.build({
					client,
				}),
			);

			setTxData(txData);
			return;
		}

		try {
			const signature = await signTransaction({
				transaction: tx,
			});

			const res = await client.executeTransactionBlock({
				transactionBlock: signature.bytes,
				signature: signature.signature,
				options: {
					showEffects: true,
					showObjectChanges: true,
				},
			});
			
			await client.waitForTransaction({
				digest: res.digest
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
