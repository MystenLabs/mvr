"use client";

import { useMemo, useState } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { usePackagesNetwork } from "../../providers/packages-provider";
import { useGetUpgradeCaps } from "@/hooks/useGetUpgradeCaps";
import { formatAddress } from "@mysten/sui/utils";
import { Text } from "../../ui/Text";
import {
  DefaultPackageDisplay,
  useGetPackageInfoObjects,
} from "@/hooks/useGetPackageInfoObjects";
import { PackageInfoStep1 } from "./Step1";
import { PackageInfoStep2 } from "./Step2";
import { useCreatePackageInfoMutation } from "@/mutations/packageInfoMutations";
import { ModalFooter } from "../ModalFooter";
import { PackageDisplayType } from "@/utils/types";
import ExplorerLink from "@/components/ui/explorer-link";

export default function CreatePackageInfo({
  closeDialog,
}: {
  closeDialog: () => void;
}) {
  const selectedNetwork = usePackagesNetwork();

  const [step, setStep] = useState(1);

  const [display, setDisplay] = useState<PackageDisplayType>(
    DefaultPackageDisplay,
  );

  const { data: upgradeCaps, refetch: refetchUpgradeCaps } =
    useGetUpgradeCaps(selectedNetwork);
  const { data: packageInfos, refetch: refetchPackageInfos } =
    useGetPackageInfoObjects(selectedNetwork);

  const { mutateAsync: execute, isPending } =
    useCreatePackageInfoMutation(selectedNetwork);

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const postCreation = async () => {
    closeDialog();
    await refetchPackageInfos();
    await refetchUpgradeCaps();
  };

  const selectedUpgradeCap = useMemo(() => {
    return upgradeCaps?.find((x) => x.package === selectedPackage);
  }, [upgradeCaps, selectedPackage]);

  const availableUpgradeCaps = useMemo(() => {
    if (!upgradeCaps || !packageInfos) return [];

    return upgradeCaps
      .filter((x) => !packageInfos.some((y) => y.upgradeCapId === x.objectId))
      .map((x) => ({
        label: formatAddress(x.objectId),
        value: x.package,
        search: x.objectId,
      }));
  }, [upgradeCaps, packageInfos]);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Metadata - Step {step}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-Large py-Regular">
        {step === 1 && (
          <PackageInfoStep1
            selectedPackage={selectedPackage}
            setSelectedPackage={setSelectedPackage}
            availableUpgradeCaps={availableUpgradeCaps}
          />
        )}
        {step === 2 && (
          <PackageInfoStep2
            packageAddress={selectedPackage ?? ""}
            display={display}
            setDisplay={setDisplay}
          />
        )}

        <Text variant="small/regular" family="inter" color="tertiary">
          Selected Upgrade Cap:{" "}
          <ExplorerLink
            network={selectedNetwork}
            type="object"
            idOrHash={selectedUpgradeCap?.objectId ?? ""}
          >
            {formatAddress(selectedUpgradeCap?.objectId ?? "")}
          </ExplorerLink>
        </Text>

        <ModalFooter
          leftBtnText={step === 1 ? "Cancel" : "Previous"}
          rightBtnText={step === 1 ? "Next" : "Create"}
          loading={isPending}
          rightBtnType={step === 1 ? "button" : "submit"}
          rightBtnDisabled={
            (step === 1 && !selectedPackage) || (step === 2 && !display.name)
          }
          leftBtnHandler={() => {
            if (step === 1) {
              closeDialog();
              return;
            }
            setStep(1);
          }}
          rightBtnHandler={async () => {
            if (step === 1) {
              setStep(2);
              return;
            }

            const upgradeCap = upgradeCaps?.find(
              (x) => x.package === selectedPackage,
            );

            if (!upgradeCap) return;

            const res = await execute({
              upgradeCapId: upgradeCap?.objectId,
              display,
              network: selectedNetwork,
            });

            if (res) await postCreation();
          }}
        />
      </div>
    </DialogContent>
  );
}
