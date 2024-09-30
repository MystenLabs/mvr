import { useSuiClientsContext } from "@/components/providers/client-provider";
import {
  assignMainnetPackage,
  registerApp,
  setExternalNetwork,
  unsetExternalNetwork,
} from "@/data/on-chain-app";
import { useChainIdentifier } from "@/hooks/useChainIdentifier";
import { AppRecord } from "@/hooks/useGetApp";
import { useTransactionExecution } from "@/hooks/useTransactionExecution";
import { type PackageInfoData } from "@/utils/types";
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";

export function useCreateAppMutation() {
  const { mainnet: client } = useSuiClientsContext();
  const { executeTransaction } = useTransactionExecution(client);
  const { data: testnetChainIdentifier } = useChainIdentifier("testnet");

  return useMutation({
    mutationKey: ["create-app"],
    mutationFn: async ({
      name,
      suinsObjectId,
      mainnetPackageInfo,
      testnetPackageInfo,
    }: {
      name: string;
      suinsObjectId: TransactionObjectArgument | string;
      mainnetPackageInfo?: PackageInfoData;
      testnetPackageInfo?: PackageInfoData;
    }) => {
      const tx = new Transaction();

      const appCap = registerApp({
        tx,
        name,
        suinsObjectId,
        mainnetPackageInfo: mainnetPackageInfo?.objectId,
      });

      if (testnetPackageInfo) {
        setExternalNetwork({
          tx,
          appCap,
          chainId: testnetChainIdentifier!,
          packageInfo: testnetPackageInfo,
        });
      }

      tx.transferObjects(
        [appCap],
        tx.moveCall({ target: `0x2::tx_context::sender` }),
      );

      const res = await executeTransaction(tx);
      return res;
    },
  });
}

export function useUpdateAppMutation() {
  const { mainnet: client } = useSuiClientsContext();
  const { executeTransaction } = useTransactionExecution(client);
  const { data: testnetChainIdentifier } = useChainIdentifier("testnet");

  return useMutation({
    mutationKey: ["update-app"],
    mutationFn: async ({
      record,
      mainnetPackageInfo,
      testnetPackageInfo,
    }: {
      record: AppRecord;
      mainnetPackageInfo?: PackageInfoData;
      testnetPackageInfo?: PackageInfoData;
    }) => {
      const tx = new Transaction();
      let updates = 0;

      console.log({record, mainnetPackageInfo, testnetPackageInfo});

      if (
        record.mainnet &&
        record.mainnet?.packageInfoId !== mainnetPackageInfo?.objectId
      )
        throw new Error("Mainnet package info cannot be updated");

      if (!record.mainnet && mainnetPackageInfo) {
        assignMainnetPackage({
          tx,
          appCap: record.appCapId,
          packageInfo: mainnetPackageInfo,
        });
        updates++;
      }

      if (!record.testnet && testnetPackageInfo) {
        setExternalNetwork({
          tx,
          appCap: record.appCapId,
          chainId: testnetChainIdentifier!,
          packageInfo: testnetPackageInfo,
        });
        updates++;
      }

      if (record.testnet && testnetPackageInfo && record.testnet?.packageInfoId !== testnetPackageInfo.objectId) {
        unsetExternalNetwork({
          tx,
          appCap: record.appCapId,
          chainId: testnetChainIdentifier!,
        });
        setExternalNetwork({
          tx,
          appCap: record.appCapId,
          chainId: testnetChainIdentifier!,
          packageInfo: testnetPackageInfo,
        });
        updates++;
      }

      if (record.testnet && !testnetPackageInfo) {
        unsetExternalNetwork({
          tx,
          appCap: record.appCapId,
          chainId: testnetChainIdentifier!,
        });
        updates++;
      }

      if (updates === 0) throw new Error("No updates to be made");
      const res = await executeTransaction(tx);
      return res;
    },
  });
}
