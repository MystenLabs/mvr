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
import { useGetPackageInfoObjects } from "@/hooks/useGetPackageInfoObjects";
import { PackageInfoSelector } from "@/components/ui/package-info-selector";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useCreateAppMutation,
  useUpdateAppMutation,
} from "@/mutations/appMutations";
import { useQueryClient } from "@tanstack/react-query";
import { AppQueryKeys } from "@/utils/types";
import { AppRecord } from "@/hooks/useGetApp";
import { AlertCircleIcon } from "lucide-react";
import { SuinsName } from "@/hooks/useOwnedSuiNSNames";

const formSchema = z
  .object({
    nsName: z.string().readonly(),
    name: z.string().min(1),
    mainnet: z.string().nullable().optional(),
    testnet: z.string().nullable().optional(),
    acceptMainnetWarning: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mainnet && !data.acceptMainnetWarning) {
      ctx.addIssue({
        path: ["acceptMainnetWarning"],
        message:
          "You've set a mainnet package so you need to accept the warning before proceeding.",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export default function CreateOrUpdateApp({
  suins,
  closeDialog,
  appRecord,
}: {
  appRecord?: AppRecord;
  suins?: SuinsName;
  closeDialog: () => void;
}) {
  const { data: mainnetPackageInfos } = useGetPackageInfoObjects("mainnet");
  const { data: testnetPackageInfos } = useGetPackageInfoObjects("testnet");
  const client = useQueryClient();

  const isUpdate = !!appRecord;

  const { mutateAsync: create, isPending } = useCreateAppMutation();
  const { mutateAsync: update, isPending: isUpdatePending } =
    useUpdateAppMutation();

  const postCreation = async () => {
    form.reset();
    closeDialog();
    client.invalidateQueries({
      queryKey: [AppQueryKeys.OWNED_APPS],
    });

    if (isUpdate)
      client.invalidateQueries({
        queryKey: [AppQueryKeys.APP, appRecord.normalized],
      });
  };

  useEffect(() => {
    if (!suins) return;
    form.setValue("nsName", suins.domainName);
  }, [suins]);

  useEffect(() => {
    if (!isUpdate) return;
    if (!appRecord) return;
    form.setValue("name", appRecord.appName);
    form.setValue("mainnet", appRecord.mainnet?.packageInfoId);
    form.setValue("testnet", appRecord.testnet?.packageInfoId);
    form.setValue("nsName", appRecord.orgName);

    // by default, if we've already set this, we should accept the warning
    if (appRecord.mainnet) {
      form.setValue("acceptMainnetWarning", true);
    }
  }, [appRecord]);

  const form = useForm<z.infer<typeof formSchema>>({
    mode: "onChange",
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let isSuccess = false;

    if (isUpdate) {
      if (!appRecord) throw new Error("No app record provided");
      const execution = await update({
        record: appRecord,
        mainnetPackageInfo: values.mainnet
          ? mainnetPackageInfos?.find((x) => x.objectId === values.mainnet)
          : undefined,
        testnetPackageInfo: values.testnet
          ? testnetPackageInfos?.find((x) => x.objectId === values.testnet)
          : undefined,
      });

      isSuccess = !!execution;
    } else {
      if (!suins) throw new Error("No suins provided");
      const execution = await create({
        name: values.name,
        suins,
        mainnetPackageInfo: values.mainnet
          ? mainnetPackageInfos?.find((x) => x.objectId === values.mainnet)
          : undefined,
        testnetPackageInfo: values.testnet
          ? testnetPackageInfos?.find((x) => x.objectId === values.testnet)
          : undefined,
      });
      isSuccess = !!execution;
    }

    if (isSuccess) postCreation();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {isUpdate ? "Updating" : "Create"} Package
          {isUpdate && `: ${appRecord.normalized}`}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="py-Regular">
          <div className="grid grid-cols-1 gap-Small">
            <FormField
              control={form.control}
              name="nsName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization / Project</FormLabel>
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
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Type your application name"
                      {...field}
                      disabled={isUpdate || field.disabled}
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
                    <FormLabel>Mainnet metadata (optional)</FormLabel>
                    <FormControl>
                      <PackageInfoSelector
                        disabled={isUpdate && !!appRecord.mainnet}
                        options={mainnetPackageInfos ?? []}
                        {...field}
                      />
                    </FormControl>
                    {isUpdate && appRecord.mainnet && (
                      <FormDescription className="flex items-center gap-Small">
                        <AlertCircleIcon size={15} />
                        Mainnet metadata has already been assigned and cannot
                        change.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="testnet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Testnet metadata (optional)</FormLabel>
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

            {!!form.getValues("mainnet") &&
              !(isUpdate && appRecord.mainnet) && (
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
              loading={isPending || isUpdatePending}
              leftBtnHandler={() => {
                form.reset();
                closeDialog();
              }}
              rightBtnDisabled={!form.formState.isValid}
              rightBtnText={isUpdate ? "Update" : "Create"}
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
  );
}
