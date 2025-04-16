import { useCopy } from "@/hooks/useCopy";
import { CopyIcon } from "lucide-react";
import { Button } from "./button";
import { CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

export function CopyBtn({
  text,
  className,
}: {
  text: string;
  className?: string;
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
        <CheckIcon className="h-3 w-3" />
      ) : (
        <CopyIcon className="h-3 w-3" />
      )}
    </Button>
  );
}
