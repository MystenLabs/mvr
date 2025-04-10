import { cn } from "@/lib/utils";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { CommandInput } from "../ui/command";
import { Input } from "../ui/input";
import { useEffect, useRef, useState } from "react";
import { useSearchMvrNames } from "@/hooks/mvrResolution";
import { Loader2 } from "lucide-react";
import { SearchResults } from "./SearchResults";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import Link from "next/link";

export function HeaderSearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isLoading } = useSearchMvrNames(searchQuery);

  return (
    <div className="bg-bg-quarternaryBleedthrough py-xs px-sm ml-xs md:ml-md relative flex w-[220px] rounded-sm text-content-secondary xl:w-[300px]">
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      ) : (
        <MagnifyingGlassIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      )}
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={cn(
          "flex h-full w-full rounded-none !border-none bg-transparent !p-0 text-sm !outline-none !ring-0 placeholder:font-light placeholder:text-content-tertiary placeholder:opacity-100 disabled:cursor-not-allowed disabled:opacity-50",
        )}
        placeholder="Search by package name..."
      />

      <SearchResults
        results={searchResults || { data: [], next_cursor: null, limit: 0 }}
      />
    </div>
  );
}
