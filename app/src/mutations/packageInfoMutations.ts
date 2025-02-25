import { PackageInfo } from "@/data/package-info";
import { useTransactionExecution } from "@/hooks/useTransactionExecution";
import { GitVersion } from "@/hooks/useVersionsTable";
import { Network, PackageDisplayType } from "@/utils/types";
import { Transaction } from "@mysten/sui/transactions";
import { useMutation } from "@tanstack/react-query";

export function useCreatePackageInfoMutation(network: Network) {
  const { executeTransaction } = useTransactionExecution(
    network as "mainnet" | "testnet",
  );

  return useMutation({
    mutationKey: ["create-package-info"],
    mutationFn: async ({
      upgradeCapId,
      display,
      network,
    }: {
      upgradeCapId?: string;
      display: PackageDisplayType;
      network: Network;
    }) => {
      const tx = new Transaction();

      if (!upgradeCapId) throw new Error("upgradeCapId is required");

      // Call the API to create a new package info object
      const packageInfo = new PackageInfo(tx);

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

export function useUpdatePackageInfoMutation(network: Network) {
  const { executeTransaction } = useTransactionExecution(
    network as "mainnet" | "testnet",
  );

  return useMutation({
    mutationKey: ["update-package-info"],
    mutationFn: async ({
      packageInfoId,
      updates,
      network,
    }: {
      packageInfoId: string;
      updates: GitVersion[];
      display?: PackageDisplayType;
      network: Network;
    }) => {
      if (!updates.length) throw new Error("No changes to save");
      const tx = new Transaction();

      // Call the API to create a new package info object
      const packageInfo = new PackageInfo(tx, packageInfoId);

      for (const update of updates) {
        if (update.action === "add") {
          packageInfo.setGitVersioning(update.version, {
            gitRepository: update.repository,
            gitSubdirectory: update.path,
            gitTag: update.tag,
          });
        }

        if (update.action === "update") {
          packageInfo
            .unsetGitVersioning(update.version)
            .setGitVersioning(update.version, {
              gitRepository: update.repository,
              gitSubdirectory: update.path,
              gitTag: update.tag,
            });
        }
      }

      const res = await executeTransaction(tx);
      return res;
    },
  });
}
