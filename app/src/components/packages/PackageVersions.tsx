import { GitVersion, useVersionsTable } from "@/hooks/useVersionsTable";
import { Version } from "./Version";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";
import { Dialog, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import CreateVersion from "../modals/versions/CreateVersion";
import { useMemo, useState } from "react";
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
  const network = usePackagesNetwork();
  const {
    data: versions,
    refetch,
    isLoading,
  } = useVersionsTable(packageInfo.gitVersionsTableId);

  const { data: latestVersion } = useGetPackageLatestVersion(
    packageInfo.packageAddress,
    network,
  );

  const orderedVersions = useMemo(() => {
    return versions?.sort((a, b) => b.version - a.version);
  }, [versions]);

  const [showCreationDialog, setShowCreationDialog] = useState(false);

  const { mutateAsync: execute, isPending } =
    useUpdatePackageInfoMutation(network);

  const [updates, setUpdates] = useState<GitVersion[]>([]);

  const takenVersions = useMemo(() => {
    return orderedVersions?.map((x) => x.version) ?? [];
  }, [orderedVersions]);

  const addUpdate = (update: GitVersion) => {
    setUpdates([...updates, update]);
  };

  const saveChanges = async () => {
    const res = await execute({
      packageInfoId: packageInfo.objectId,
      updates,
      network,
    });

    if (res) {
      refetch();
      setUpdates([]);
    }
  };

  if (isLoading) return <LoadingState />;

  if (
    !orderedVersions ||
    (orderedVersions.length === 0 && updates.length === 0)
  )
    return (
      <Dialog open={showCreationDialog} onOpenChange={setShowCreationDialog}>
        <CreateVersion
          maxVersion={latestVersion}
          closeDialog={() => setShowCreationDialog(false)}
          addUpdate={addUpdate}
        />
        <div className="p-Regular">
          <EmptyState size="sm" {...Content.emptyStates.versions}>
            <CreateVersionTrigger disableEdits={disableEdits} />
          </EmptyState>
        </div>
      </Dialog>
    );

  return (
    <Dialog open={showCreationDialog} onOpenChange={setShowCreationDialog}>
      <CreateVersion
        maxVersion={latestVersion}
        taken={takenVersions}
        closeDialog={() => setShowCreationDialog(false)}
        addUpdate={addUpdate}
      />
      <div className="mb-Regular grid grid-cols-1 gap-Regular px-Small">
        {orderedVersions?.map((x) => <Version key={x.version} version={x} />)}

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
        <CreateVersionTrigger disableEdits={disableEdits} />

        {updates.length > 0 && (
          <Button isLoading={isPending} onClick={saveChanges}>
            Save Changes
          </Button>
        )}
      </div>
    </Dialog>
  );
}

const CreateVersionTrigger = ({ disableEdits }: { disableEdits?: boolean }) => {
  if (disableEdits) return null;

  return (
    <DialogTrigger asChild>
      <Button variant="default">Create version</Button>
    </DialogTrigger>
  );
};
