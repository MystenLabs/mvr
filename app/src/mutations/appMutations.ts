import { useSuiClientsContext } from "@/components/providers/client-provider";
import { registerApp, setExternalNetwork } from "@/data/on-chain-app";
import { useChainIdentifier } from "@/hooks/useChainIdentifier";
import { PackageInfo } from "@/hooks/useGetPackageInfoObjects";
import { SuinsName } from "@/hooks/useOwnedSuiNSNames";
import { useTransactionExecution } from "@/hooks/useTransactionExecution";
import { Transaction } from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";

export function useCreateAppMutation() {
  const { mainnet: client } = useSuiClientsContext();
  const { executeTransaction } = useTransactionExecution(client);
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
      mainnetPackageInfo?: PackageInfo;
      testnetPackageInfo?: PackageInfo;
    }) => {
      const tx = new Transaction();

      const appCap = registerApp({
        tx,
        name,
        suinsObjectId: suins.nftId,
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
