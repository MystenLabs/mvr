"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { ModalFooter } from "../ModalFooter";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
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
import { SuinsName } from "@/hooks/useOrganizationList";
import { useIsNameAvailable } from "@/hooks/useIsNameAvailable";
import { useDebounce } from "@/hooks/useDebounce";
import { METADATA_KEYS } from "@/data/on-chain-app";
import { TextArea } from "@/components/ui/textarea";
import { Text } from "@/components/ui/Text";
import equal from "fast-deep-equal/es6/react";
import { nullishValueChanged } from "@/lib/utils";

const formSchema = z
  .object({
    nsName: z.string().readonly(),
    name: z.string().min(1),
    mainnet: z.string().nullable().optional(),
    testnet: z.string().nullable().optional(),
    acceptMainnetWarning: z.boolean().optional(),
    description: z.string().optional(),
    icon_url: z.string().optional(),
    documentation_url: z.string().optional(),
    homepage_url: z.string().optional(),
    contact: z.string().optional(),
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

const formToMetadata = (form: z.infer<typeof formSchema>) => {
  const metadata: Record<string, string> = {};
  for (const key of Object.keys(form)) {
    if (METADATA_KEYS.includes(key)) {
      const value = form[key as keyof typeof form];
      if (value === undefined) continue;
      metadata[key] = value as string;
    }
  }
  return metadata;
};

export default function CreateOrUpdateApp({
  suins,
  appRecord,
  closeDialog = () => {},
  useDialog = true,
}: {
  appRecord?: AppRecord;
  suins?: SuinsName;
  closeDialog?: () => void;
  useDialog?: boolean;
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

  const initFormFromAppRecord = (appRecord: AppRecord) => {
    const values: Record<keyof z.infer<typeof formSchema>, any> = {
      name: appRecord.appName,
      mainnet: appRecord.mainnet?.packageInfoId,
      testnet: appRecord.testnet?.packageInfoId,
      nsName: appRecord.orgName,
      description: appRecord.metadata.description || "",
      icon_url: appRecord.metadata.icon_url || "",
      documentation_url: appRecord.metadata.documentation_url || "",
      homepage_url: appRecord.metadata.homepage_url || "",
      contact: appRecord.metadata.contact || "",
      acceptMainnetWarning: appRecord.mainnet ? true : false,
    };

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) continue;
      values[key as keyof z.infer<typeof formSchema>] = value;
    }

    return values;
  };

  const resetForm = () => {
    form.reset(isUpdate ? initFormFromAppRecord(appRecord) : undefined, {
      keepErrors: false,
    });
  };

  useEffect(() => {
    if (!isUpdate) return;
    if (!appRecord) return;
    resetForm();
  }, [appRecord]);

  const form = useForm<z.infer<typeof formSchema>>({
    mode: "onChange",
    resolver: zodResolver(formSchema),
  });

  const name = useWatch({ control: form.control, name: "name" });
  const debouncedName = useDebounce(name, 300);

  const { data: isNameAvailable, isLoading: isNameAvailableLoading } =
    useIsNameAvailable(
      `${suins?.domainName}/${debouncedName}`,
      !!debouncedName && !!suins?.domainName,
    );

  // A deep comparison of the form values, to enable / disable the
  // "Save Changes" button.
  const values = form.watch();
  const formChanged = useMemo(() => {
    // do not block creations for any case.
    if (!isUpdate) return true;
    if (!appRecord) return true;

    const metadata = formToMetadata(values);

    let metadataChanged = false;

    for (const key of METADATA_KEYS) {
      metadataChanged =
        metadataChanged ||
        nullishValueChanged(metadata[key], appRecord?.metadata[key]);
    }

    const mainnetChanged = nullishValueChanged(
      values.mainnet,
      appRecord?.mainnet?.packageInfoId,
    );
    const testnetChanged = nullishValueChanged(
      values.testnet,
      appRecord?.testnet?.packageInfoId,
    );

    return metadataChanged || mainnetChanged || testnetChanged;
  }, [values, appRecord]);

  // handle name availability state.
  useEffect(() => {
    if (isNameAvailableLoading) return;
    if (isUpdate) return;
    if (!isNameAvailable && !!name) {
      form.setError("name", {
        type: "manual",
        message: "Name is already taken",
      });
    } else {
      form.clearErrors("name");
    }
  }, [isNameAvailable, debouncedName]);

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
        metadata: formToMetadata(values),
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
        metadata: formToMetadata(values),
      });
      isSuccess = !!execution;
    }

    if (isSuccess) postCreation();
  }

  return (
    <ModalWrapper
      isUpdate={isUpdate}
      appRecord={appRecord}
      useDialog={useDialog}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="py-Regular">
          <div className="gap-md grid grid-cols-1">
            {!isUpdate && (
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
            )}

            {!isUpdate && (
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
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormOptionalLabel title="Description" />
                  <FormControl>
                    <TextArea
                      {...field}
                      placeholder="A short description to help users understand & search for your package"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon_url"
              render={({ field }) => (
                <FormItem>
                  <FormOptionalLabel title="Icon URL" />
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Your app's icon URL (e.g. https://docs.suins.io/logo.svg)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="homepage_url"
              render={({ field }) => (
                <FormItem>
                  <FormOptionalLabel title="Homepage URL" />
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Your app's homepage URL (e.g. https://suins.io)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentation_url"
              render={({ field }) => (
                <FormItem>
                  <FormOptionalLabel title="Documentation URL" />
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Your documentation link e.g. https://docs.suins.io/move-registry"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormOptionalLabel title="Contact" />
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Any contact information that users can use to reach you (e.g. email, telegram etc)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gap-md mb-md grid grid-cols-1">
              <FormField
                control={form.control}
                name="mainnet"
                render={({ field }) => (
                  <FormItem>
                    <FormOptionalLabel title="Mainnet metadata" />
                    <FormControl>
                      <PackageInfoSelector
                        disabled={isUpdate && !!appRecord.mainnet}
                        options={mainnetPackageInfos ?? []}
                        {...field}
                      />
                    </FormControl>
                    {isUpdate && appRecord.mainnet && (
                      <FormDescription className="gap-sm flex items-center">
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
                    <FormOptionalLabel title="Testnet metadata" />
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
                    <FormItem className="bg-bg-tertiary flex flex-row items-start space-x-3 space-y-0 rounded-md p-4">
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
                resetForm();
                if (useDialog) closeDialog();
              }}
              leftBtnDisabled={!useDialog && !formChanged}
              rightBtnDisabled={
                !form.formState.isValid ||
                (!isUpdate && !isNameAvailable) ||
                !formChanged
              }
              rightBtnText={isUpdate ? "Save Changes" : "Create"}
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
              alignLeft={isUpdate}
            />
          </div>
        </form>
      </Form>
    </ModalWrapper>
  );
}

const ModalWrapper = ({
  children,
  isUpdate,
  appRecord,
  useDialog,
}: {
  children: ReactNode;
  isUpdate: boolean;
  appRecord?: AppRecord;
  useDialog: boolean;
}) =>
  useDialog ? (
    <DialogContent className="max-h-[95%] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {isUpdate ? "Updating" : "Create"} Package
          {isUpdate && `: ${appRecord?.normalized}`}
        </DialogTitle>
      </DialogHeader>
      {children}
    </DialogContent>
  ) : (
    <>{children}</>
  );

const FormOptionalLabel = ({ title }: { title: ReactNode }) => {
  return (
    <FormLabel className="gap-xs flex items-center">
      {title}
      <Text
        kind="paragraph"
        size="paragraph-small"
        className="!font-light text-content-secondary"
      >
        (Optional)
      </Text>
    </FormLabel>
  );
};
