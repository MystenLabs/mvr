import { useSuiClientsContext } from "@/components/providers/client-provider";
import { PackageInfo } from "@/data/package-info";
import { PackageDisplayType, PackageInfoPackageIds } from "@/hooks/useGetPackageInfoObjects";
import { useTransactionExecution } from "@/hooks/useTransactionExecution";
import { Network } from "@/utils/types";
import { Transaction } from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";

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
      const packageInfo = new PackageInfo(tx, PackageInfoPackageIds[network]);

      packageInfo.new(upgradeCapId);
      packageInfo.setDisplay(
        display.name,
        display.gradientFrom,
        display.gradientTo,
        display.textColor,
      );

      packageInfo.tranfer({
        selfTransfer: true,
      });

      const res = await executeTransaction(tx);
      return res;
    },
  });
}
