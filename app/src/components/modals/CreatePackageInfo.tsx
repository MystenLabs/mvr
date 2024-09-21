"use client";

import { useMemo, useState } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { ComboBox } from "../ui/combobox";
import { usePackagesNetwork } from "../providers/packages-provider";
import { useGetUpgradeCaps } from "@/hooks/useGetUpgradeCaps";
import { Network } from "@/utils/types";
import { formatAddress } from "@mysten/sui/utils";
import { usePackageModules } from "@/hooks/usePackageModules";
import { Text } from "../ui/Text";
import { useGetPackageInfoObjects } from "@/hooks/useGetPackageInfoObjects";
import { cn } from "@/lib/utils";

export default function CreatePackageInfo() {
  const selectedNetwork = usePackagesNetwork();

  const { data: upgradeCaps } = useGetUpgradeCaps(selectedNetwork);
  const { data: packageInfos } = useGetPackageInfoObjects(selectedNetwork);

  const [selectedPackage, setSelectedPackage] = useState(null);

  const { data: packageModules } = usePackageModules(selectedPackage ?? "");

  const availableUpgradeCaps = useMemo(() => {
    if (!upgradeCaps || !packageInfos) return [];

    return upgradeCaps[selectedNetwork]
      .filter(
        (x) =>
          !packageInfos[selectedNetwork].some(
            (y) => y.upgradeCapId === x.objectId,
          ),
      )
      .map((x) => ({
        label: formatAddress(x.objectId),
        value: x.package,
      }));
  }, [upgradeCaps, packageInfos]);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Package Info</DialogTitle>
        <DialogDescription>
          <div className="grid grid-cols-1 gap-Regular py-Regular">
            <div>
              <label>
                <Text
                  variant="xsmall/medium"
                  family="inter"
                  color="tertiary"
                  className="pb-XSmall uppercase"
                >
                  Select Upgrade Cap
                </Text>
              </label>
              <ComboBox
                searchText="Paste your ID here..."
                value={selectedPackage}
                setValue={setSelectedPackage}
                options={availableUpgradeCaps}
              />
            </div>

            <div
              className={cn(
                "min-h-32 rounded-xl border border-border-classic p-Small",
                !packageModules && "flex items-center justify-center",
              )}
            >
              {packageModules ? (
                <>
                  <label>
                    <Text
                      variant="xsmall/medium"
                      family="inter"
                      color="tertiary"
                      className="pb-XSmall uppercase"
                    >
                      SELECTED PACKAGE MODULES
                    </Text>
                  </label>

                  {packageModules.map((module) => (
                    <Text key={module} variant="small/regular">
                      {module}
                    </Text>
                  ))}
                </>
              ) : (
                <Text variant="small/regular" family="inter">
                  Modules from your selected upgrade cap will be shown here.
                </Text>
              )}
            </div>
          </div>
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  );
}
