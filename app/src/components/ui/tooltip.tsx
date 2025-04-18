import { Tooltip } from "react-tooltip";

const generateRandomId = () => {
  return `id-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
};

export function TooltipWrapper({
  children,
  tooltipText,
  tooltipPlace,
}: {
  children: React.ReactNode;
  tooltipText: string;
  tooltipPlace: "top" | "bottom" | "left" | "right";
}) {
  const tooltipId = generateRandomId();

  return (
    <>
      <div
        className="text-12 leading-12"
        data-tooltip-id={tooltipId}
        data-tooltip-content={tooltipText}
        data-tooltip-place={tooltipPlace}
      >
        {children}
      </div>
      <Tooltip
        id={tooltipId}
        className="rounded-md border border-stroke-secondary !text-12 leading-3 font-normal"
      />
    </>
  );
}
