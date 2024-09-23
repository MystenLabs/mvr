import { useSuiClientsContext } from "@/components/providers/client-provider";
import { PackageInfo } from "@/data/package-info";
import { PackageDisplayType } from "@/hooks/useGetPackageInfoObjects";
import { useTransactionExecution } from "@/hooks/useTransactionExecution";
import { Network } from "@/utils/types";
import { Transaction } from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";

// TODO: Split this out properly. Now it's hard-coded to testnet.
const PACKAGE_ADDR = '0x3335c4965a6f26aedeb39a652e6ebe555bb83ae531a5309745a14cf725b0a100';

export function useCreatePackageInfoMutation(network: Network) {

    const { [network]: client } = useSuiClientsContext();

    const { executeTransaction } = useTransactionExecution(client);

  return useMutation({
    mutationKey: ["create-package-info"],
    mutationFn: async ({
      upgradeCapId,
      display,
      network,
    }: {
      upgradeCapId?: string;
      display: PackageDisplayType;
      network: Network
    }) => {
      const tx = new Transaction();

      if (!upgradeCapId) throw new Error("upgradeCapId is required");

      // Call the API to create a new package info object
      const packageInfo = new PackageInfo(tx, PACKAGE_ADDR);

      packageInfo.new(upgradeCapId);
      packageInfo.setDisplay(
        display.name,
        display.gradientFrom,
        display.gradientTo,
      );
      packageInfo.tranfer({
        selfTransfer: true,
      });

      const res = await executeTransaction(tx);
      return res;
    },
  });
}
