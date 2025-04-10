import { GitVersion } from "@/hooks/useVersionsTable";
import { Text } from "../ui/Text";
import { Button } from "../ui/button";
import { PencilIcon } from "lucide-react";

export function Version({
  version,
  onUpdate,
}: {
  version: GitVersion;
  onUpdate?: (version: GitVersion) => void;
}) {
  return (
    <div className="gap-xxs grid grid-cols-1">
      <div className="mb-xs border-stroke-secondary pb-xs flex items-center justify-between gap-5 border-b">
        <Text
          kind="heading"
          size="heading-xs"
          className="text-content-secondary"
        >
          {version.action === "add" && "(+)"} Version {version.version}
          {version.action === "update" && " (updated)"}
        </Text>
        {onUpdate && (
          <Button
            variant="secondary"
            size="sm"
            className="rounded-sm"
            onClick={() => onUpdate(version)}
          >
            <PencilIcon className="size-3" />
          </Button>
        )}
      </div>

      <Text kind="paragraph" size="paragraph-small" className="text-content-secondary">
        Git URL:{" "}
        <span className="text-content-primary">{version.repository}</span>
      </Text>
      <Text kind="paragraph" size="paragraph-small" className="text-content-secondary">
        Path:{" "}
        <span className="text-content-primary">{version.path || "-"}</span>
      </Text>
      <Text kind="paragraph" size="paragraph-small" className="text-content-secondary">
        Tag / Branch:{" "}
        <span className="text-content-primary">{version.tag || "-"}</span>
      </Text>
    </div>
  );
}
