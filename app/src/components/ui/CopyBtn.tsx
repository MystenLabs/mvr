import { useCopy } from "@/hooks/useCopy";
import { CopyIcon } from "lucide-react";
import { Button } from "./button";
import { CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

const iconSize = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
};

export function CopyBtn({
  text,
  className,
  size = "md",
}: {
  text: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { copied, copy } = useCopy(text);

  return (
    <Button
      variant="link"
      size="fit"
      onClick={copy}
      className={cn("px-0 py-0", className)}
    >
      {copied ? (
        <CheckIcon className={cn(iconSize[size])} />
      ) : (
        <CopyIcon className={cn(iconSize[size])} />
      )}
    </Button>
  );
}
