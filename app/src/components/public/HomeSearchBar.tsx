import { cn } from "@/lib/utils";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Input } from "../ui/input";
import { SearchResult } from "@/hooks/mvrResolution";
import { Loader2 } from "lucide-react";
import { SearchResults } from "./SearchResults";
import { Content } from "@/data/content";

type HomeSearchBarProps = {
  isDebouncing: boolean;
  isLoading: boolean;
  searchQuery: string;
  handleFocus: () => void;
  handleBlur: () => void;
  setSearchQuery: (query: string) => void;
  searchResults?: SearchResult;
  isInputFocused: boolean;
  className?: string;
};

export function HomeSearchBar({
  isDebouncing,
  isLoading,
  searchQuery,
  handleFocus,
  handleBlur,
  setSearchQuery,
  searchResults,
  isInputFocused,
  className,
}: HomeSearchBarProps) {
  return (
    <div
      className={cn(
        "bg-purpleSalmonOp12 relative mt-lg rounded-full p-[2px]",
        isInputFocused && "bg-purpleBlue",
        !isInputFocused && "bg-purpleBlueOp40",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full items-center rounded-full bg-[#1E1B3C] px-lg",
          isInputFocused && "text-content-primary",
          !isInputFocused && "text-content-secondary",
        )}
      >
        {(isDebouncing || isLoading) && !!searchQuery ? (
          <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin opacity-50" />
        ) : (
          <MagnifyingGlassIcon className="mr-2 h-5 w-5 shrink-0 opacity-50" />
        )}
        <Input
          value={searchQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            "flex h-full w-full rounded-none !border-none bg-transparent !px-0 !py-md text-sm !outline-none !ring-0 placeholder:font-light placeholder:text-content-tertiary placeholder:opacity-100 disabled:cursor-not-allowed disabled:opacity-50",
          )}
          placeholder={Content.searchPackage}
        />
      </div>
      <SearchResults
        results={searchResults || { data: [], next_cursor: null, limit: 0 }}
        hidden={!isInputFocused}
      />
    </div>
  );
}
