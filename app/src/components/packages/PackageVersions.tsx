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
import { PackageInfo } from "@/hooks/useGetPackageInfoObjects";

export function PackageVersions({ packageInfo }: { packageInfo: PackageInfo }) {
  const network = usePackagesNetwork();
  const { data: versions } = useVersionsTable(packageInfo.gitVersionsTableId);

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
    console.log(updates);
  };

  const saveChanges = async () => {
    const res = await execute({
      packageInfoId: packageInfo.objectId,
      updates,
      network,
    });
    console.log(res);
  };

  if (
    !orderedVersions ||
    (orderedVersions.length === 0 && updates.length === 0)
  )
    return (
      <Dialog open={showCreationDialog} onOpenChange={setShowCreationDialog}>
        <CreateVersion
          closeDialog={() => setShowCreationDialog(false)}
          addUpdate={addUpdate}
        />
        <div className="p-Regular">
          <EmptyState size="sm" {...Content.emptyStates.versions}>
            <DialogTrigger asChild>
              <Button variant="default">Create version</Button>
            </DialogTrigger>
          </EmptyState>
        </div>
      </Dialog>
    );

  return (
    <Dialog open={showCreationDialog} onOpenChange={setShowCreationDialog}>
      <CreateVersion
        taken={takenVersions}
        closeDialog={() => setShowCreationDialog(false)}
        addUpdate={addUpdate}
      />
      <DialogTrigger asChild>
        <Button variant="default">Create version</Button>
      </DialogTrigger>
      {orderedVersions?.map((x) => <Version key={x.version} version={x} />)}
      {updates.map((x) => (
        <Version key={x.version} version={x} />
      ))}

      {updates.length > 0 && (
        <div className="grid grid-cols-1 justify-start pt-Regular">
          <Button isLoading={isPending} onClick={saveChanges}>
            Save Changes
          </Button>
        </div>
      )}
    </Dialog>
  );
}
