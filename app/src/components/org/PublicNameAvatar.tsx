import { GlobeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The (non-organization) avatar of a public name (e.g. `@pkg`): public names
 * have no publisher, so they never get the icon of one of their packages.
 */
export function PublicNameAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-stroke-primary text-content-secondary",
        className,
      )}
    >
      <GlobeIcon className="h-1/2 w-1/2" />
    </span>
  );
}
