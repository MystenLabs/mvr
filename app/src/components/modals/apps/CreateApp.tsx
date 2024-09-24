"use client";

import { useEffect, useState } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { ModalFooter } from "../ModalFooter";
import { useOwnedApps } from "@/hooks/useOwnedApps";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SuinsName } from "@/hooks/useOwnedSuiNSNames";
import { useGetPackageInfoObjects } from "@/hooks/useGetPackageInfoObjects";
import { PackageInfoSelector } from "@/components/ui/package-info-selector";

const formSchema = z.object({
  nsName: z.string().readonly(),
  name: z.string(),
  mainnet: z.string().optional(),
  testnet: z.string().optional(),
});

export default function CreateApp({
  suins,
  closeDialog,
}: {
  suins: SuinsName;
  closeDialog: () => void;
}) {
  const [step, setStep] = useState(1);
  const { data: apps } = useOwnedApps();

  const { data: mainnetPackageInfos } = useGetPackageInfoObjects("mainnet");
  const { data: testnetPackageInfos } = useGetPackageInfoObjects("testnet");

  console.log(mainnetPackageInfos?.mainnet, testnetPackageInfos?.testnet);

  const postCreation = async () => {
    closeDialog();
  };

  useEffect(() => {
    form.setValue("nsName", suins.domainName);
  }, [suins]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // form.reset();
    // closeDialog();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Application - Step {step}</DialogTitle>
        <DialogDescription>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="py-Regular">
              <div className="grid grid-cols-1 gap-Small">
                <FormField
                  control={form.control}
                  name="nsName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Organization</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={true} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Type your application name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border border-border-classic p-Regular rounded-2xl grid grid-cols-1 gap-Regular">
                  <FormField
                    control={form.control}
                    name="mainnet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mainnet package</FormLabel>
                        <FormControl>
                          <PackageInfoSelector
                            options={mainnetPackageInfos?.mainnet ?? []}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="testnet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Testnet package</FormLabel>
                        <FormControl>
                          <PackageInfoSelector
                            options={testnetPackageInfos?.testnet ?? []}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                  }}
                />
              </div>
            </form>
          </Form>
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  );
}
