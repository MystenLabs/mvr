import { beautifySuiAddress } from "@/lib/utils";
import { useCopy } from "@/hooks/useCopy";
import Link from "next/link";
import { Text } from "./Text";
import { CopyBtn } from "./CopyBtn";
import { TooltipWrapper } from "./tooltip";

export function DependencyLabel({
  dependency,
  isResolved,
  calls,
}: {
  dependency: string;
  isResolved: boolean;
  calls?: number;
}) {
  if (isResolved) {
    return (
      <DependencyTooltipWrapper calls={calls}>
        <Link href={`/package/${dependency}`}>
          <div className="rounded-full bg-bg-accentBleedthrough2 px-md py-xs hover:bg-bg-accentBleedthrough1">
            <Text kind="label" size="label-small">
              {dependency}
            </Text>
          </div>
        </Link>
      </DependencyTooltipWrapper>
    );
  }

  return (
    <DependencyTooltipWrapper calls={calls}>
      <div className="flex items-center gap-xs rounded-full bg-bg-accentBleedthrough3 px-md py-xs">
        <Text kind="label" size="label-small">
          {beautifySuiAddress(dependency)}
        </Text>
        <CopyBtn text={dependency} />
      </div>
    </DependencyTooltipWrapper>
  );
}

function DependencyTooltipWrapper({
  children,
  calls,
}: {
  children: React.ReactNode;
  calls?: number;
}) {
  return !!calls ? (
    <TooltipWrapper tooltipText={`# of calls: ${calls}`} tooltipPlace="top">
      {children}
    </TooltipWrapper>
  ) : (
    children
  );
}
