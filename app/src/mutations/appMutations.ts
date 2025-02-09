import { useSuiClientsContext } from "@/components/providers/client-provider";
import {
  assignMainnetPackage,
  registerApp,
  setExternalNetwork,
  unsetExternalNetwork,
} from "@/data/on-chain-app";
import { useChainIdentifier } from "@/hooks/useChainIdentifier";
import { AppRecord } from "@/hooks/useGetApp";
import { SuinsName } from "@/hooks/useOwnedSuiNSNames";
import { useTransactionExecution } from "@/hooks/useTransactionExecution";
import { sender } from "@/lib/utils";
import { type PackageInfoData } from "@/utils/types";
import { KioskTransaction } from "@mysten/kiosk";
import {
  Transaction,
} from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";

export function useCreateAppMutation() {
  const { kiosk: {mainnet: kioskClient } } = useSuiClientsContext();
  const { executeTransaction } = useTransactionExecution('mainnet');
  const { data: testnetChainIdentifier } = useChainIdentifier("testnet");

  return useMutation({
    mutationKey: ["create-app"],
    mutationFn: async ({
      name,
      suins,
      mainnetPackageInfo,
      testnetPackageInfo,
    }: {
      name: string;
      suins: SuinsName;
      mainnetPackageInfo?: PackageInfoData;
      testnetPackageInfo?: PackageInfoData;
    }) => {
      const tx = new Transaction();

      let kioskTx;
      let nsObject, promise;
      
      if (suins.kioskCap) {
        kioskTx = new KioskTransaction({
          transaction: tx,
          kioskClient,
          cap: suins.kioskCap,
        });

        const [item, returnPromise] = kioskTx.borrow({
          itemId: suins.nftId,
          itemType: suins.objectType!,
        });

        nsObject = item;
        promise = returnPromise;
      }

      const appCap = registerApp({
        tx,
        name,
        suinsObjectId: nsObject ?? suins.nftId,
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

      if (nsObject && promise) {
        kioskTx?.return({
          itemType: suins.objectType!,
          item: nsObject,
          promise,
        });

        kioskTx?.finalize();
      }

      tx.transferObjects(
        [appCap],
        sender(tx),
      );

      const res = await executeTransaction(tx);
      return res;
    },
  });
}

export function useUpdateAppMutation() {
  const { mainnet: client } = useSuiClientsContext();
  const { executeTransaction } = useTransactionExecution('mainnet');
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
