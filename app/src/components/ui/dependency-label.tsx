import { beautifySuiAddress } from "@/lib/utils";
import { useCopy } from "@/hooks/useCopy";
import Link from "next/link";
import { Text } from "./Text";
import { CopyBtn } from "./CopyBtn";

export function DependencyLabel({
  dependency,
  isResolved,
}: {
  dependency: string;
  isResolved: boolean;
}) {
  if (isResolved) {
    return (
      <Link href={`/package/${dependency}`}>
        <div className="rounded-full bg-bg-accentBleedthrough2 px-md py-xs hover:bg-bg-accentBleedthrough1">
          <Text kind="label" size="label-small">
            {dependency}
          </Text>
        </div>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-xs rounded-full bg-bg-accentBleedthrough3 px-md py-xs">
      <Text kind="label" size="label-small">
        {beautifySuiAddress(dependency)}
      </Text>
      <CopyBtn text={dependency} />
    </div>
  );
}
