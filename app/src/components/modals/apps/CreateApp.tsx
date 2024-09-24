"use client";

import { useState } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { ModalFooter } from "../ModalFooter";
import { useOwnedApps } from "@/hooks/useOwnedApps";

export default function CreteAppDialog({
  closeDialog,
}: {
  closeDialog: () => void;
}) {
  const [step, setStep] = useState(1);

  const { data: apps} = useOwnedApps();

  const postCreation = async () => {
    closeDialog();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Package Info - Step {step}</DialogTitle>
        <DialogDescription>
          <div className="grid grid-cols-1 gap-Large py-Regular">

            <ModalFooter
              leftBtnText={step === 1 ? "Cancel" : "Previous"}
              rightBtnText={step === 1 ? "Next" : "Create"}
              loading={false}
              rightBtnType={step === 1 ? "button" : "submit"}
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

                // const upgradeCap = upgradeCaps?.[selectedNetwork].find(
                //   (x) => x.package === selectedPackage,
                // );

                // if (!upgradeCap) return;

                // const res = await execute({
                //   upgradeCapId: upgradeCap?.objectId,
                //   display,
                //   network: selectedNetwork,
                // });

                // if (res) await postCreation();
              }}
            />
          </div>
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  );
}
