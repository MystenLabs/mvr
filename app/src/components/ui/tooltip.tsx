import { useId } from "react";
import { Tooltip } from "react-tooltip";

export function TooltipWrapper({
  children,
  tooltipText,
  tooltipPlace,
}: {
  children: React.ReactNode;
  tooltipText: string;
  tooltipPlace: "top" | "bottom" | "left" | "right";
}) {
  // `useId()` yields a stable id across server render and client hydration,
  // so the tooltip anchor markup no longer mismatches (was Math.random()+Date.now()).
  const tooltipId = useId();

  return (
    <>
      <div
        className="leading-12 text-12"
        data-tooltip-id={tooltipId}
        data-tooltip-content={tooltipText}
        data-tooltip-place={tooltipPlace}
      >
        {children}
      </div>
      <Tooltip
        id={tooltipId}
        className="z-[9999] max-w-[300px] rounded-md border border-stroke-secondary !text-12 font-normal leading-5"
      />
    </>
  );
}
