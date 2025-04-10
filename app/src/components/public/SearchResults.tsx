"use client";

import { SearchResult, type SearchResultItem } from "@/hooks/mvrResolution";
import Link from "next/link";
import { Text } from "../ui/Text";

export function SearchResults({
  results,
  hidden = false,
}: {
  hidden?: boolean;
  results: SearchResult;
}) {
  if (!results?.data.length || hidden) return null;

  return (
    <div className="mt-xs border-stroke-secondary bg-bg-quarternaryBleedthrough absolute left-0 top-full z-50 max-h-[300px] w-full overflow-y-auto rounded-md border shadow-lg backdrop-blur-lg">
      {results.data.map((item, index) => (
        <SearchResultItem key={index} item={item} />
      ))}
    </div>
  );
}

export function SearchResultItem({ item }: { item: SearchResultItem }) {
  return (
    <Link
      href={`/package/${item.name}`}
      className="hover:bg-bg-accentBleedthrough3 py-sm px-md border-stroke-secondary flex items-center border-b"
    >
      <div>
        <Text
          kind="heading"
          size="heading-xxs"
          className="text-content-primary"
        >
          {item.name}
        </Text>
        <Text
          kind="paragraph"
          size="paragraph-xs"
          className="text-content-secondary"
        >
          {item.metadata.description}
        </Text>
      </div>
    </Link>
  );
}
