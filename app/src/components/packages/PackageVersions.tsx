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
import { type PackageInfoData } from "@/utils/types";
import LoadingState from "../LoadingState";
import { useGetPackageLatestVersion } from "@/hooks/useGetLatestVersion";

export function PackageVersions({
  packageInfo,
  disableEdits,
}: {
  packageInfo: PackageInfoData;
  disableEdits?: boolean;
}) {
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [updates, setUpdates] = useState<GitVersion[]>([]);
  const [forUpdate, setForUpdate] = useState<GitVersion | null>(null);

  const network = usePackagesNetwork();
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
  };

  const saveChanges = async () => {
    const res = await execute({
      packageInfoId: packageInfo.objectId,
      updates,
      network,
    });

    if (res) {
      reset();
      refetch();
    }
  };

  if (isLoading) return <LoadingState />;

  if (
    !orderedVersions ||
    (orderedVersions.length === 0 && updates.length === 0)
  )
    return (
      <Dialog open={showCreationDialog} onOpenChange={setShowCreationDialog}>
        <CreateOrUpdateVersion
          packageAddress={packageInfo.packageAddress}
          maxVersion={latestVersion}
          closeDialog={() => setShowCreationDialog(false)}
          addUpdate={addUpdate}
        />
        <div className="p-Regular">
          <EmptyState size="sm" {...Content.emptyStates.versions}>
            <CreateVersionTrigger
              disableEdits={
                isLoadingLatestVersion ||
                takenVersions.length >= latestVersion ||
                disableEdits
              }
              reset={() => setForUpdate(null)}
            />
          </EmptyState>
        </div>
      </Dialog>
    );

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
      <div className="mb-Regular grid grid-cols-1 gap-Regular px-Small">
        {orderedVersions?.map((x) => (
          <Version
            key={x.version}
            version={x}
            onUpdate={disableEdits ? undefined :() => {
              setForUpdate({ ...x });
              setShowCreationDialog(true);
            }}
          />
        ))}

        {updates.length > 0 && (
          <>
            <Text variant="xsmall/bold" color="primary" className="uppercase">
              Changes to save
            </Text>
            {updates.map((x) => (
              <Version key={x.version} version={x} />
            ))}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-Small px-Small">
        <CreateVersionTrigger
          disableEdits={
            isLoadingLatestVersion ||
            disableEdits ||
            takenVersions.length >= latestVersion
          }
          reset={() => setForUpdate(null)}
        />

        {updates.length > 0 && (
          <>
            <Button isLoading={isPending} onClick={saveChanges}>
              Save Changes
            </Button>

            <Button
              variant="link"
              onClick={() => {
                reset();
              }}
            >
              Cancel
            </Button>
          </>
        )}
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
