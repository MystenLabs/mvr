import { cn } from "@/lib/utils";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { CommandInput } from "../ui/command";
import { Input } from "../ui/input";
import { useEffect, useRef, useState } from "react";
import { useSearchMvrNames } from "@/hooks/mvrResolution";
import { Loader2 } from "lucide-react";
import { SearchResults } from "./SearchResults";
import { useDebounce } from "@/hooks/useDebounce";
import { Content } from "@/data/content";

export function HeaderSearchBar() {
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleFocus = () => setIsInputFocused(true);
  const handleBlur = () => {
    // Timeout needed to allow dropdown click before it disappears
    setTimeout(() => setIsInputFocused(false), 100);
  };

  const [searchQuery, setSearchQuery] = useState("");

  const { value: debouncedSearch, isDebouncing } = useDebounce(
    searchQuery,
    400,
  );

  const { data: searchResults, isLoading } = useSearchMvrNames(debouncedSearch);

  return (
    <div className="bg-bg-quarternaryBleedthrough py-xs px-sm ml-xs md:ml-md relative flex items-center w-[220px] rounded-sm text-content-secondary xl:w-[500px]">
      {(isDebouncing || isLoading) && !!searchQuery ? (
        <Loader2 className="mr-2 h-4 w-4 shrink-0 opacity-50 animate-spin" />
      ) : (
        <MagnifyingGlassIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      )}
      <Input
        value={searchQuery}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={cn(
          "flex h-full w-full rounded-none !border-none bg-transparent !p-0 text-sm !outline-none !ring-0 placeholder:font-light placeholder:text-content-tertiary placeholder:opacity-100 disabled:cursor-not-allowed disabled:opacity-50",
        )}
        placeholder={Content.searchPackage}
      />

      <SearchResults
        results={searchResults || { data: [], next_cursor: null, limit: 0 }}
        hidden={!isInputFocused}
      />
    </div>
  );
}
