import { PackageInfo } from "@/data/package-info";
import { useTransactionExecution } from "@/hooks/useTransactionExecution";
import { GitVersion } from "@/hooks/useVersionsTable";
import { nullishValueChanged } from "@/lib/utils";
import { Network, PackageDisplayType, PackageInfoData } from "@/utils/types";
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
      pkgInfo,
      updates,
      metadata,
    }: {
      pkgInfo: PackageInfoData;
      updates: GitVersion[];
      display?: PackageDisplayType;
      metadata?: Record<string, string>;
    }) => {
      const tx = new Transaction();

      // Call the API to create a new package info object
      const packageInfo = new PackageInfo(tx, pkgInfo.objectId);

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

      for (const [key, value] of Object.entries(metadata ?? {})) {
        const hasChanged = nullishValueChanged(value, pkgInfo.metadata?.[key]);
        if (!hasChanged) continue;

        // remove if it existed..
        if (pkgInfo.metadata.hasOwnProperty(key))
          packageInfo.unsetMetadata(key);

        // set the new value.
        packageInfo.setMetadata(key, value);
      }

      if (!packageInfo.isEdited()) throw new Error("No changes to save");

      const res = await executeTransaction(tx);
      return res;
    },
  });
}
