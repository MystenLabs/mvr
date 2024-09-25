"use client";

import { useMemo, useState } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { usePackagesNetwork } from "../../providers/packages-provider";
import { useGetUpgradeCaps } from "@/hooks/useGetUpgradeCaps";
import { formatAddress } from "@mysten/sui/utils";
import { Text } from "../../ui/Text";
import {
  DefaultPackageDisplay,
  PackageDisplayType,
  useGetPackageInfoObjects,
} from "@/hooks/useGetPackageInfoObjects";
import { PackageInfoStep1 } from "./Step1";
import { PackageInfoStep2 } from "./Step2";
import { useCreatePackageInfoMutation } from "@/mutations/packageInfoMutations";
import { ModalFooter } from "../ModalFooter";

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
        <DialogContent>
          <DialogTitle>Create Package Info - Step {step}</DialogTitle>
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
              Selected Upgrade Cap: {formatAddress(selectedPackage ?? "")}
            </Text>

            <ModalFooter
              leftBtnText={step === 1 ? "Cancel" : "Previous"}
              rightBtnText={step === 1 ? "Next" : "Create"}
              loading={isPending}
              rightBtnType={step === 1 ? "button" : "submit"}
              rightBtnDisabled={
                (step === 1 && !selectedPackage) ||
                (step === 2 && !display.name)
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

                const upgradeCap = upgradeCaps?.[selectedNetwork].find(
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
      </DialogHeader>
    </DialogContent>
  );
}
