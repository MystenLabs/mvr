"use client";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "@/components/ui/input";
import { set, z } from "zod";
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
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LucideFileWarning, Terminal, VerifiedIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CodeIcon from "@/icons/CodeIcon";

const formSchema = z.object({
  version: z.coerce.number().positive(),
  repository: z.string().url(),
  path: z.string().optional(),
  tag: z.string(),
});

const DefaultValues = {
  version: undefined,
  repository: "",
  path: "",
  tag: "",
};

export default function CreateOrUpdateVersion({
  closeDialog,
  addUpdate,
  maxVersion,
  packageAddress,
  taken = [],
  updateState,
}: {
  taken?: (number | string)[];
  updateState?: GitVersion | null;
  maxVersion?: number;
  packageAddress: string;
  addUpdate: (update: GitVersion) => void;
  closeDialog: () => void;
}) {
  const [configError, setConfigError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isValidatingConfig, setIsValidatingConfig] = useState(false);
  const network = usePackagesNetwork();
  const { graphql } = useSuiClientsContext();

  const client = useQueryClient();

  useEffect(() => {
    if (updateState) {
      form.setValue("version", updateState.version);
      form.setValue("repository", updateState.repository);
      form.setValue("path", updateState.path);
      form.setValue("tag", updateState.tag);
    } else {
      form.reset(DefaultValues);
    }
  }, [updateState]);

  const isVersionValid = () => {
    if (updateState) return true;
    const current = +form.getValues().version;
    if (!maxVersion) return false;
    if (current > maxVersion) return false;
    if (taken.map((x) => +x).includes(current)) return false;

    return true;
  };

  const form = useForm<z.infer<typeof formSchema>>({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
    defaultValues: DefaultValues,
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    addUpdate({
      action: updateState ? "update" : "add",
      ...values,
      path: values.path ?? "",
    });

    form.reset(DefaultValues);
    closeDialog();
  }

  const formChanges = useWatch(form);

  useEffect(() => {
    setConfigError("");
    setSuccess(false);
  }, [formChanges]);

  const isComplete = () => {
    const values = form.getValues();

    return (
      values.version && values.repository && values.tag && isVersionValid()
    );
  };

  const versionOptions = useMemo(() => {
    const options = [];
    for (let i = 1; i < (maxVersion ?? 0) + 1; i++) {
      if (!taken.includes(+i)) options.push({ value: i, label: i.toString() });
    }

    if (updateState) {
      options.push({
        value: updateState.version,
        label: updateState.version.toString(),
      });
    }
    return options;
  }, [maxVersion, taken, updateState]);

  const validateConfig = async () => {
    if (!isComplete()) return;
    setIsValidatingConfig(true);

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
        throw new Error(
          `The version in the Move.lock file does not match the version you're trying to create.`,
        );
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
        throw new Error(`
          Original Package ID missmatch - Found ${originalId}, expected ${original}`);
      }

      if (atVersion !== publishedId) {
        throw new Error(`
          Version ${values.version} Package ID missmatch - Found ${publishedId}, expected ${atVersion}`);
      }

      setSuccess(true);
    } catch (e: any) {
      console.log(e);
      setConfigError(
        e?.message ??
          "Failed to retreive your source code's `Move.lock` file. Ignore this error if if your repository is private.",
      );
    }
    setIsValidatingConfig(false);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Version</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="py-Regular">
          <div className="grid grid-cols-1 gap-md">
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your version</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(+val)}
                    defaultValue={field.value?.toString()}
                    disabled={!!updateState}
                  >
                    <FormControl>
                      <SelectTrigger disabled={versionOptions.length === 0}>
                        <SelectValue placeholder="Select a version" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {versionOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value.toString()}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  variant="linkActive"
                  className="w-fit"
                  isLoading={isValidatingConfig}
                  onClick={() => validateConfig()}
                >
                  <VerifiedIcon className="mr-3 h-4 w-4" />
                  Validate configuration (optional)
                </Button>

                <Alert>
                  <CodeIcon className="h-4 w-4" />
                  <AlertTitle className="font-inter">
                    Validation works only on open source repositories
                  </AlertTitle>
                  <AlertDescription className="pt-XSmall font-inter text-xs">
                    <Text
                      kind="paragraph"
                      size="paragraph-small"
                      className="text-content-primary"
                    >
                      Validation tries to download your `Move.lock` file from
                      the specified repository, and checks if the version there
                      matches the version you're trying to create, as well as
                      the package ids (original / published-at). <br />
                      <br />* This does not verify the source, it only verifies
                      the configuration, and can end up with many false
                      positives.
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
                    <Text
                      kind="paragraph"
                      size="paragraph-small"
                      className="text-content-negative"
                    >
                      {configError}
                    </Text>
                  </AlertDescription>
                </Alert>
              </>
            )}

            <ModalFooter
              rightBtnDisabled={
                !form.formState.isValid || (!isVersionValid() && !configError)
              }
              rightBtnText={updateState ? "Update Version" : "Create Version"}
              leftBtnHandler={closeDialog}
            />
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}
