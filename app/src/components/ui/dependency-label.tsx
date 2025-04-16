import { CopyIcon } from "@radix-ui/react-icons";

import { beautifySuiAddress } from "@/lib/utils";

import { useCopy } from "@/hooks/useCopy";
import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { Text } from "./Text";
import { Button } from "./button";

export function DependencyLabel({
  dependency,
  isResolved,
}: {
  dependency: string;
  isResolved: boolean;
}) {
  const { copied, copy } = useCopy(dependency);

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
      <Button variant="link" size="fit" onClick={copy} className="px-0 py-0">
        {copied ? (
          <CheckIcon className="h-3 w-3" />
        ) : (
          <CopyIcon className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
