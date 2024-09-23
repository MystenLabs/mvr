"use client";

import { useMemo, useState } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Button } from "../../ui/button";
import { PackageInfoStep1 } from "./Step1";
import { PackageInfoStep2 } from "./Step2";
import { useCreatePackageInfoMutation } from "@/mutations/packageInfoMutations";

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

  const { data: upgradeCaps, refetch: refetchUpgradeCaps } = useGetUpgradeCaps(selectedNetwork);
  const { data: packageInfos, refetch: refetchPackageInfos } = useGetPackageInfoObjects(selectedNetwork);

  const { mutateAsync: execute, isPending } = useCreatePackageInfoMutation(selectedNetwork);

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const postCreation = async () => {
    closeDialog();
    await refetchPackageInfos();
    await refetchUpgradeCaps();
  }

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
        <DialogTitle>Create Package Info - Step {step}</DialogTitle>
        <DialogDescription>
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

            <div className="grid gap-Small md:grid-cols-2">
              <Button
                variant="tertiary"
                onClick={() => {
                  if (step === 1) {
                    closeDialog();
                    return;
                  }
                  setStep(1);
                }}
                className="max-md:order-2"
              >
                <Text variant="small/regular" family="inter">
                  {step === 1 ? "Cancel" : "Previous"}
                </Text>
              </Button>

              <Button
                variant="default"
                disabled={(step === 1 && !selectedPackage) || (step === 2 && !display.name)}
                className="max-md:order-1"
                isLoading={isPending}
                onClick={async () => {
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
                  // handle creation.
                }}
              >
                <Text variant="small/regular" family="inter">
                  {step === 1 ? "Next" : "Create"}
                </Text>
              </Button>
            </div>
          </div>
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  );
}