import { cn } from "@/lib/utils";
import { Button } from "./button";

export function LoadMore({
  hasNextPage,
  fetchNextPage,
  isLoading,
  className,
}: {
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isLoading: boolean;
  className?: string;
}) {
  if (!hasNextPage) return null;

  return (
    <div className="mt-md flex justify-center">
      <Button
        onClick={() => fetchNextPage()}
        variant="linkActive"
        size="fit"
        className={cn(
          "mx-auto mt-md",
          className,
          isLoading && "opacity-50 pointer-events-none",
        )}
        disabled={isLoading}
      >
        Load more
      </Button>
    </div>
  );
}
