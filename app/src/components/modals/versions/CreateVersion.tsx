"use client";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "@/components/ui/input";
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
import { ModalFooter } from "../ModalFooter";
import { GitVersion } from "@/hooks/useVersionsTable";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LucideFileWarning, Terminal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppQueryKeys } from "@/utils/types";
import {
  parseEnvironmentsFromLockfile,
  querySource,
} from "@/hooks/useGetSourceFromGit";
import { usePackagesNetwork } from "@/components/providers/packages-provider";
import { useSuiClientsContext } from "@/components/providers/client-provider";
import { queryVersions } from "@/hooks/useGetLatestVersion";
import { Text } from "@/components/ui/Text";

const formSchema = z.object({
  version: z.coerce.number().positive(),
  repository: z.string().url(),
  path: z.string().optional(),
  tag: z.string(),
});

export default function CreateVersion({
  type = "add",
  closeDialog,
  addUpdate,
  maxVersion,
  packageAddress,
  taken = [],
}: {
  taken?: (number | string)[];
  type?: "add" | "update" | "delete";
  maxVersion?: number;
  packageAddress: string;
  addUpdate: (update: GitVersion) => void;
  closeDialog: () => void;
}) {
  const [configError, setConfigError] = useState("");
  const [success, setSuccess] = useState(false);
  const network = usePackagesNetwork();
  const { graphql } = useSuiClientsContext();

  const client = useQueryClient();

  const isVersionValid = () => {
    const current = +form.getValues().version;
    if (!maxVersion) return false;
    if (current > maxVersion) return false;
    if (taken.map((x) => +x).includes(current)) return false;

    return true;
  };

  /// Validate the version and do not allow duplicates
  const extraValidations = () => {
    const current = +form.getValues().version;
    if (taken.map((x) => +x).includes(current)) {
      form.setError("version", {
        type: "manual",
        message: "Version has to be unique per package",
      });
    } else if (current > (maxVersion ?? 0)) {
      form.setError("version", {
        type: "manual",
        message: `Version has to be less than or equal to ${maxVersion} (maximum package version)`,
      });
    } else {
      form.clearErrors("version");
      if (!!form.getValues().version) form.trigger("version");
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    mode: "onChange",
    resolver: zodResolver(formSchema),
  });

  const watch = useWatch(form);

  useEffect(() => {
    // reset error when we change.
    setConfigError("");
    setSuccess(false);

    extraValidations();
  }, [watch, maxVersion]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    addUpdate({
      action: type,
      ...values,
      path: values.path ?? "",
    });

    form.reset();
    closeDialog();
  }

  const isComplete = () => {
    const values = form.getValues();

    return (
      values.version && values.repository && values.tag && isVersionValid()
    );
  };

  const validateConfig = async () => {
    if (!isComplete()) return;

    const values = form.getValues();

    try {
      const source = await client.fetchQuery({
        queryKey: [AppQueryKeys.GIT_SOURCE, values],
        queryFn: async () => {
          return querySource({
            url: values.repository,
            subPath: values.path ?? "",
            tagOrHash: values.tag,
          });
        },

        // we cache the source code for a long time, since it's not expected to change
        staleTime: Infinity,
        retry: false,
        gcTime: Infinity,
      });

      const envSetup = parseEnvironmentsFromLockfile(source, network);

      if (+(envSetup["published-version"] ?? 0) !== +values.version) {
        setConfigError(
          "The version in the Move.lock file does not match the version you're trying to create.",
        );
        return;
      }

      const originalId = envSetup["original-published-id"];
      const publishedId = envSetup["latest-published-id"];

      const gqlClient = graphql[network as "mainnet" | "testnet"];
      if (!gqlClient) throw new Error("Invalid network");

      const versionPackageAddresses = await client.fetchQuery({
        queryKey: [
          AppQueryKeys.PACKAGE_INIT_AND_AT_VERSION,
          packageAddress,
          +values.version,
        ],
        queryFn: async () => {
          return queryVersions(gqlClient, packageAddress, +values.version);
        },

        // we cache the source code for a long time, since it's not expected to change
        staleTime: Infinity,
        retry: false,
        gcTime: Infinity,
      });

      const atVersion = (
        versionPackageAddresses?.data?.atVersion as Record<string, any>
      )?.packageAtVersion?.address;
      const original = (
        versionPackageAddresses?.data?.original as Record<string, any>
      )?.packageAtVersion?.address;

      if (original !== originalId) {
        setConfigError(
          `Version 1 Package ID missmatch - Found ${originalId}, expected ${original}`,
        );
        return;
      }

      if (atVersion !== publishedId) {
        setConfigError(
          `Version ${values.version} Package ID missmatch - Found ${publishedId}, expected ${atVersion}`,
        );
        return;
      }

      setSuccess(true);
    } catch (e: any) {
      console.log(e);
      setConfigError(
        e?.message ??
          "Failed to retreive your source code's `Move.lock` file. Ignore this error if if your repository is private.",
      );
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Version</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="py-Regular">
          <div className="grid grid-cols-1 gap-Small">
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your version</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter your version"
                      {...field}
                      onInput={extraValidations}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="repository"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package's repository</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your repository (e.g. https://github.com/MystenLabs/sui.git)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package's path</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter the path in the repository (e.g. crates/sui-framework/packages/sui-framework)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty if the `Move.toml` file is in the root of the
                    repository.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version's Commit SHA / Tag</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter the tag or branch the source code lives in (e.g. framework/mainnet)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This must be an immutable pointer (commit SHA or tag). Learn
                    more about how to properly keep your versions by clicking
                    here.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!configError && !success && isComplete() && (
              <>
                <Button
                  type="button"
                  className="w-fit"
                  onClick={() => validateConfig()}
                >
                  Validate configuration
                </Button>

                <Alert>
                  <Terminal className="h-4 w-4" />
                  <AlertTitle className="font-inter">
                    Validation works only on open source repositories
                  </AlertTitle>
                  <AlertDescription className="pt-XSmall font-inter text-xs">

                    <Text variant="xsmall/regular" color="tertiary" family="inter">

                    Validation tries to download your `Move.lock` file from the
                    specified repository, and checks if the version there
                    matches the version you're trying to create, as well as the
                    package ids (original / published-at). <br /><br/>* This does not
                    verify the source, it only verifies the configuration, and
                    might report false positives.
                    </Text>
                  </AlertDescription>
                </Alert>
              </>
            )}

            {configError && (
              <>
                <Alert>
                  <LucideFileWarning className="h-4 w-4" />
                  <AlertTitle>Failed to validate configuration</AlertTitle>
                  <AlertDescription>
                  <Text variant="xsmall/regular" color="tertiary" family="inter">
                  {configError}
                  </Text></AlertDescription>
                </Alert>
              </>
            )}

            <ModalFooter
              rightBtnDisabled={
                !form.formState.isValid || (!isVersionValid() && !configError)
              }
              rightBtnText="Create Version"
              leftBtnHandler={closeDialog}
            />
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}
