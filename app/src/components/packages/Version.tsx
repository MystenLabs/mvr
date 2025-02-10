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
    <div className="grid grid-cols-1 gap-XXSmall">
      <div className="mb-XSmall flex items-center justify-between gap-5 border-b border-border-classic pb-XSmall">
        <Text
          variant="xxsmall/semibold"
          color="tertiary"
          className="uppercase"
          family="inter"
        >
          {version.action === "add" && "(+)"} Version {version.version}
          {version.action === "update" && " (updated)"}
        </Text>
        {onUpdate && (
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => onUpdate(version)}
          >
            <PencilIcon className="size-3" />
          </Button>
        )}
      </div>

      <Text variant="small/regular" color="secondary" family="inter">
        Git URL:{" "}
        <span className="text-content-primary">{version.repository}</span>
      </Text>
      <Text variant="small/regular" color="secondary" family="inter">
        Path:{" "}
        <span className="text-content-primary">{version.path || "-"}</span>
      </Text>
      <Text variant="small/regular" color="secondary" family="inter">
        Tag / Branch:{" "}
        <span className="text-content-primary">{version.tag || "-"}</span>
      </Text>
    </div>
  );
}
