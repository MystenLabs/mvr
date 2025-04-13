"use client";

import { SearchResult, type SearchResultItem } from "@/hooks/mvrResolution";
import Link from "next/link";
import { Text } from "../ui/Text";
import ImageWithFallback from "../ui/image-with-fallback";
import { cn } from "@/lib/utils";

export function SearchResults({
  results,
  hidden = false,
}: {
  hidden?: boolean;
  results: SearchResult;
}) {
  if (!results?.data.length || hidden) return null;

  return (
    <div className="absolute left-0 top-full z-50 mt-xs max-h-[300px] w-full overflow-y-auto rounded-md border border-stroke-secondary bg-bg-quarternaryBleedthrough shadow-lg backdrop-blur-lg">
      {results.data.map((item, index) => (
        <SearchResultItem
          key={index}
          item={item}
          isLast={index === results.data.length - 1}
        />
      ))}
    </div>
  );
}

export function SearchResultItem({
  item,
  isLast,
}: {
  item: SearchResultItem;
  isLast: boolean;
}) {
  return (
    <Link
      href={`/package/${item.name}`}
      className={cn(
        "flex items-center gap-sm px-md py-sm hover:bg-bg-accentBleedthrough3",
        !isLast && "border-b border-stroke-secondary",
      )}
    >
      <div className="flex-shrink-0 max-w-[10%]">
        <ImageWithFallback
          src={item.metadata.icon_url}
          className="h-8 w-8 rounded-sm"
          fallback={`/default-icon.svg`}
        />
      </div>
      <div className="max-w-[50%]">
        <Text
          kind="heading"
          size="heading-xxxs"
          className="text-content-primary"
        >
          {item.name}
        </Text>
        {/* todo: figure out how to do 2nd-line cutoff instead */}
        <Text
          kind="paragraph"
          size="paragraph-xs"
          className=" line-clamp-2 text-content-secondary"
        >
          {item.metadata.description}
        </Text>
      </div>

      <div className="ml-auto flex items-center flex-wrap gap-sm max-w-[30%]">
        {item.mainnet_package_info_id && <Text kind="label" size="label-xs" className="bg-mainnetSearch rounded-full px-xs text-content-primary">Mainnet</Text>}
        {item.testnet_package_info_id && <Text kind="label" size="label-xs" className="bg-testnetSearch rounded-full px-xs text-content-primary">Testnet</Text>}
      </div>
    </Link>
  );
}
