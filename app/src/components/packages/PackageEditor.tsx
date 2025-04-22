import { GitVersion, useVersionsTable } from "@/hooks/useVersionsTable";
import { Version } from "./Version";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";
import { Dialog, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import CreateOrUpdateVersion from "../modals/versions/CreateOrUpdateVersion";
import { useEffect, useMemo, useState } from "react";
import { useUpdatePackageInfoMutation } from "@/mutations/packageInfoMutations";
import { usePackagesNetwork } from "../providers/packages-provider";
import { Text } from "../ui/Text";
import { AppQueryKeys, type PackageInfoData } from "@/utils/types";
import LoadingState from "../LoadingState";
import { useGetPackageLatestVersion } from "@/hooks/useGetLatestVersion";
import { isValidNamedPackage } from "@mysten/sui/utils";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion";
import { Input } from "../ui/input";
import { cn, nullishValueChanged } from "@/lib/utils";
import { Label } from "../ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useIsFocused } from "@/hooks/useIsFocused";

export function PackageEditor({
  packageInfo,
  disableEdits,
}: {
  packageInfo: PackageInfoData;
  disableEdits?: boolean;
}) {
  const network = usePackagesNetwork();
  const queryClient = useQueryClient();

  const { isFocused, handleBlur, handleFocus } = useIsFocused();

  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [updates, setUpdates] = useState<GitVersion[]>([]);
  const [forUpdate, setForUpdate] = useState<GitVersion | null>(null);

  const [defaultMvrName, setDefaultMvrName] = useState(
    packageInfo.metadata?.default || "",
  );

  useEffect(
    () => setDefaultMvrName(packageInfo.metadata?.default || ""),
    [packageInfo],
  );

  // Check if the default name has changed.
  const hasNameChanged = useMemo(() => {
    return nullishValueChanged(defaultMvrName, packageInfo.metadata?.default);
  }, [defaultMvrName, packageInfo.metadata]);

  // Check if the default name is a valid MVR name.
  const isValidName = useMemo(() => {
    if (!defaultMvrName) return true;
    return isValidNamedPackage(defaultMvrName) && defaultMvrName.includes("@");
  }, [defaultMvrName]);

  const {
    data: versions,
    refetch,
    isLoading,
  } = useVersionsTable(packageInfo.gitVersionsTableId);

  const { data: latestVersion, isLoading: isLoadingLatestVersion } =
    useGetPackageLatestVersion(packageInfo.packageAddress, network);

  const orderedVersions = useMemo(() => {
    return versions?.sort((a, b) => b.version - a.version);
  }, [versions]);

  const { mutateAsync: execute, isPending } =
    useUpdatePackageInfoMutation(network);

  const takenVersions = useMemo(() => {
    const updateTakenVersions = updates
      .map((x) => (x.action === "add" ? x.version : null))
      .filter((x) => x !== null);
    return [
      ...(orderedVersions?.map((x) => x.version) ?? []),
      ...updateTakenVersions,
    ];
  }, [orderedVersions, updates]);

  const addUpdate = (update: GitVersion) => {
    let newUpdates = [...updates];

    // avoid duplicate edits for the same version.
    if (updates.some((x) => x.version === update.version)) {
      newUpdates = newUpdates.filter((x) => x.version !== update.version);
    }

    setUpdates([...newUpdates, update]);
  };

  // When the package changes, reset the form inputs.
  useEffect(() => reset(), [packageInfo]);

  const reset = () => {
    setForUpdate(null);
    setUpdates([]);
    setDefaultMvrName(packageInfo.metadata?.default || "");
  };

  const saveChanges = async () => {
    const res = await execute({
      pkgInfo: packageInfo,
      updates,
      metadata: {
        default: defaultMvrName,
      },
    });

    if (res) {
      queryClient.invalidateQueries({
        queryKey: [AppQueryKeys.PACKAGE_INFO_BY_ID, packageInfo.objectId],
      });
      refetch();
      reset();
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <Dialog open={showCreationDialog} onOpenChange={setShowCreationDialog}>
      <CreateOrUpdateVersion
        packageAddress={packageInfo.packageAddress}
        maxVersion={latestVersion}
        taken={takenVersions}
        updateState={forUpdate}
        closeDialog={() => setShowCreationDialog(false)}
        addUpdate={addUpdate}
      />

      <div className="mb-md grid grid-cols-1 gap-md">
        <Label
          className={cn(
            "text-sm",
            !isFocused && !isValidName && "text-accent-red",
          )}
        >
          Default MVR name (reverse resolution)
        </Label>
        <Input
          value={defaultMvrName}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Type your MVR name here to enable reverse resolution (e.g. @mvr/core)"
          onChange={(e) => {
            setDefaultMvrName(e.target.value);
          }}
          hasError={!isFocused && !isValidName}
        />
        {!isFocused && defaultMvrName && !isValidName && (
          <Text
            kind="paragraph"
            size="paragraph-small"
            className="text-accent-red"
          >
            The supplied MVR name is invalid. Use a valid name to proceed (e.g. @mvr/core).
          </Text>
        )}
      </div>

      {!!orderedVersions?.length && (
        <Accordion defaultValue={["versions"]} type="multiple">
          <AccordionItem
            value="versions"
            className="border-b border-stroke-secondary"
          >
            <AccordionTrigger>Source Code Versioning</AccordionTrigger>
            <AccordionContent className="mb-md grid grid-cols-1 gap-md">
              {orderedVersions?.map((x) => (
                <Version
                  key={x.version}
                  version={x}
                  onUpdate={
                    disableEdits
                      ? undefined
                      : () => {
                          setForUpdate({ ...x });
                          setShowCreationDialog(true);
                        }
                  }
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {!orderedVersions?.length && !updates.length && (
        <EmptyState size="md" {...Content.emptyStates.versions}>
          <CreateVersionTrigger
            disableEdits={disableEdits}
            reset={() => setForUpdate(null)}
          />
        </EmptyState>
      )}

      {/* List the changes that are about to be committed. */}
      <ListedUpdates updates={updates} hasNameChanged={hasNameChanged} />

      <div className="gap-Small px-Small flex flex-wrap">
        {!!orderedVersions?.length && (
          <CreateVersionTrigger
            disableEdits={
              isLoadingLatestVersion ||
              disableEdits ||
              takenVersions.length >= latestVersion
            }
            reset={() => setForUpdate(null)}
          />
        )}

        <SaveOrCancel
          hasUpdates={updates.length > 0 || hasNameChanged}
          isLoading={isPending}
          save={saveChanges}
          cancel={reset}
          canUpdate={(updates.length > 0 || hasNameChanged) && isValidName}
        />
      </div>
    </Dialog>
  );
}

const CreateVersionTrigger = ({
  disableEdits,
  reset,
}: {
  disableEdits?: boolean;
  reset: () => void;
}) => {
  if (disableEdits) return null;

  return (
    <DialogTrigger asChild onClick={reset}>
      <Button>Create version</Button>
    </DialogTrigger>
  );
};

// List the changes that are about to be committed.
const ListedUpdates = ({
  updates,
  hasNameChanged,
}: {
  updates: GitVersion[];
  hasNameChanged: boolean;
}) => {
  return (
    <div className="mb-md mt-sm grid grid-cols-1 gap-md">
      {(updates.length > 0 || hasNameChanged) && (
        <>
          <Text
            kind="label"
            size="label-small"
            className="uppercase text-content-secondary"
          >
            Changes to save
          </Text>
          {updates.map((x) => (
            <Version key={x.version} version={x} />
          ))}
          {hasNameChanged && (
            <>
              <Text
                kind="paragraph"
                size="paragraph-small"
                className="text-content-primary"
              >
                (+) Default name has changed.
              </Text>
            </>
          )}
        </>
      )}
    </div>
  );
};

const SaveOrCancel = ({
  hasUpdates,
  isLoading,
  canUpdate = false,
  save,
  cancel,
}: {
  hasUpdates: boolean;
  canUpdate?: boolean;
  isLoading: boolean;
  save: () => void;
  cancel: () => void;
}) => {
  if (!hasUpdates) return null;
  return (
    <div className="gap-Small px-Small mt-sm flex flex-wrap">
      <>
        <Button isLoading={isLoading} onClick={save} disabled={!canUpdate}>
          Save Changes
        </Button>

        <Button variant="link" onClick={cancel}>
          Cancel
        </Button>
      </>
    </div>
  );
};
