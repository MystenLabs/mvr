import { GitVersion } from "@/hooks/useVersionsTable";
import { Version } from "./Version";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";
import { Dialog, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import CreateVersion from "../modals/versions/CreateVersion";
import { useState } from "react";

export function PackageVersions({ versions }: { versions: GitVersion[] }) {

  const [showCreationDialog, setShowCreationDialog] = useState(false);

  if (versions.length === 0)
    return (
      <Dialog open={showCreationDialog} onOpenChange={setShowCreationDialog}>
        <CreateVersion closeDialog={() => setShowCreationDialog(false)} />
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
    <>
      {versions.map((x) => (
        <Version key={x.version} version={x} />
      ))}
    </>
  );
}
