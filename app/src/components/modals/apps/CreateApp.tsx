"use client";

import { useEffect, useState } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { ModalFooter } from "../ModalFooter";
import { useOwnedApps } from "@/hooks/useOwnedApps";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SuinsName } from "@/hooks/useOwnedSuiNSNames";
import { useGetPackageInfoObjects } from "@/hooks/useGetPackageInfoObjects";
import { PackageInfoSelector } from "@/components/ui/package-info-selector";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z
  .object({
    nsName: z.string().readonly(),
    name: z.string().min(3),
    mainnet: z.string().optional(),
    testnet: z.string().optional(),
    acceptMainnetWarning: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    console.log(data);
    if (data.mainnet && !data.acceptMainnetWarning) {
      ctx.addIssue({
        path: ["acceptMainnetWarning"],
        message:
          "You've set a mainnet package so you need to accept the warning before proceeding.",
        code: z.ZodIssueCode.custom,
      });
    }
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

  const postCreation = async () => {
    closeDialog();
  };

  useEffect(() => {
    form.setValue("nsName", suins.domainName);
  }, [suins]);

  const form = useForm<z.infer<typeof formSchema>>({
    mode: "onChange",
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
        <DialogContent>
          <DialogTitle>Create Application</DialogTitle>
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

                <div className="mt-Regular grid grid-cols-1 gap-Regular rounded-2xl border border-border-classic p-Regular">
                  <FormField
                    control={form.control}
                    name="mainnet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mainnet package (optional)</FormLabel>
                        <FormControl>
                          <PackageInfoSelector
                            options={mainnetPackageInfos ?? []}
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
                        <FormLabel>Testnet package (optional)</FormLabel>
                        <FormControl>
                          <PackageInfoSelector
                            options={testnetPackageInfos ?? []}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!!form.getValues("mainnet") && (
                  <FormField
                    control={form.control}
                    name="acceptMainnetWarning"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border-classic p-4">
                        <FormControl>
                          <Checkbox
                            className="mt-1"
                            checked={field.value}
                            onCheckedChange={(value) => {
                              console.log(value);
                              if (value === "indeterminate") return;
                              form.setValue("acceptMainnetWarning", value);
                              form.trigger("acceptMainnetWarning");
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel className="cursor-pointer font-bold">
                            I understand this action is irreversible
                          </FormLabel>
                          <FormDescription className="leading-normal">
                            I understand that after attaching a mainnet package
                            info, this app name will be permanently associated
                            with the selected package.
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                <ModalFooter
                  loading={false}
                  leftBtnHandler={closeDialog}
                  rightBtnDisabled={!form.formState.isValid}
                  rightBtnHandler={async () => {
                    const values = form.getValues();
                    if (values.mainnet && !values.acceptMainnetWarning) {
                      form.setError("acceptMainnetWarning", {
                        type: "manual",
                        message: "Please accept the warning",
                      });
                      return;
                    }
                  }}
                />
              </div>
            </form>
          </Form>
        </DialogContent>
      </DialogHeader>
    </DialogContent>
  );
}
