import { useSuiClientsContext } from "@/components/providers/client-provider";
import {
  assignMainnetPackage,
  registerApp,
  registerPublicNameApp,
  removeMetadata,
  setExternalNetwork,
  setMetadata,
  unsetExternalNetwork,
} from "@/data/on-chain-app";
import { useChainIdentifier } from "@/hooks/useChainIdentifier";
import { AppRecord } from "@/hooks/useGetApp";
import { SuinsName } from "@/hooks/useOrganizationList";
import { useTransactionExecution } from "@/hooks/useTransactionExecution";
import { sender } from "@/lib/utils";
import { type PackageInfoData } from "@/utils/types";
import { KioskTransaction } from "@mysten/kiosk";
import { Transaction } from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";

export function useCreateAppMutation() {
  const {
    kiosk: { mainnet: kioskClient },
  } = useSuiClientsContext();
  const { executeTransaction } = useTransactionExecution("mainnet");
  const { data: testnetChainIdentifier } = useChainIdentifier("testnet");

  return useMutation({
    mutationKey: ["create-app"],
    mutationFn: async ({
      name,
      suins,
      mainnetPackageInfo,
      testnetPackageInfo,
      metadata,
    }: {
      name: string;
      suins: SuinsName;
      mainnetPackageInfo?: PackageInfoData;
      testnetPackageInfo?: PackageInfoData;
      metadata: Record<string, string>;
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

      const appCap = suins.isPublicName
        ? registerPublicNameApp({
            tx,
            name,
            publicNameObjectId: suins.nftId,
            mainnetPackageInfo: mainnetPackageInfo?.objectId,
          })
        : registerApp({
            tx,
            name,
            suinsObjectId: nsObject ?? suins.nftId,
            mainnetPackageInfo: mainnetPackageInfo?.objectId,
            isSubname: suins.isSubname,
          });

      if (testnetPackageInfo) {
        setExternalNetwork({
          tx,
          appCap,
          chainId: testnetChainIdentifier!,
          packageInfo: testnetPackageInfo,
        });
      }

      for (const [key, value] of Object.entries(metadata)) {
        setMetadata({
          tx,
          appCap,
          key,
          value,
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

      tx.transferObjects([appCap], sender(tx));

      const res = await executeTransaction(tx);
      return res;
    },
  });
}

export function useUpdateAppMutation() {
  const { mainnet: client } = useSuiClientsContext();
  const { executeTransaction } = useTransactionExecution("mainnet");
  const { data: testnetChainIdentifier } = useChainIdentifier("testnet");

  return useMutation({
    mutationKey: ["update-app"],
    mutationFn: async ({
      record,
      mainnetPackageInfo,
      testnetPackageInfo,
      metadata,
    }: {
      record: AppRecord;
      mainnetPackageInfo?: PackageInfoData;
      testnetPackageInfo?: PackageInfoData;
      metadata: Record<string, string>;
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

      if (
        record.testnet &&
        testnetPackageInfo &&
        record.testnet?.packageInfoId !== testnetPackageInfo.objectId
      ) {
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

      for (const [key, value] of Object.entries(metadata)) {
        const preExistingKey = Object.hasOwn(record.metadata, key);
        // if the value is the same as the pre-existing value, or the value is not set, skip.
        if (
          (preExistingKey && record.metadata[key] === value) ||
          (!preExistingKey && !value)
        )
          continue;

        if (preExistingKey) {
          removeMetadata({
            tx,
            appCap: record.appCapId,
            key,
          });
        }

        setMetadata({
          tx,
          appCap: record.appCapId,
          key,
          value,
        });
        updates++;
      }

      if (updates === 0) throw new Error("No updates to be made");
      const res = await executeTransaction(tx);
      return res;
    },
  });
}
