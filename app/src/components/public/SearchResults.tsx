"use client";

import { SearchResult, type SearchResultItem } from "@/hooks/mvrResolution";
import Link from "next/link";
import { Text } from "../ui/Text";
import ImageWithFallback from "../ui/image-with-fallback";
import { cn } from "@/lib/utils";
import { Content } from "@/data/content";
import { useIsFocused } from "@/hooks/useIsFocused";

export function SearchResults({
  results,
  hidden = false,
}: {
  hidden?: boolean;
  results: SearchResult;
}) {
  const { isFocused, handleFocus, handleBlur } = useIsFocused();
  if (!results?.data.length || (hidden && !isFocused)) return null;

  return (
    <div
      className="absolute left-0 top-full z-50 mt-xs max-h-[300px] w-full overflow-y-auto rounded-md border border-stroke-secondary bg-bg-quarternaryBleedthrough shadow-lg backdrop-blur-lg"
      onMouseEnter={handleFocus}
      onMouseLeave={handleBlur}
    >
      {results.data.map((item, index) => (
        <SearchResultItem
          key={item.name}
          item={item}
          isLast={index === results.data.length - 1}
          handleBlur={handleBlur}
        />
      ))}
    </div>
  );
}

export function SearchResultItem({
  item,
  isLast,
  handleBlur,
}: {
  item: SearchResultItem;
  isLast: boolean;
  handleBlur?: () => void;
}) {
  return (
    <Link
      href={`/package/${item.name}`}
      className={cn(
        "flex items-center gap-sm px-md py-sm hover:bg-bg-accentBleedthrough3",
        !isLast && "border-b border-stroke-secondary",
      )}
      onClick={() => {
        handleBlur?.();
      }}
    >
      <div className="max-w-[10%] flex-shrink-0">
        <ImageWithFallback
          key={item.metadata.icon_url}
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
          className="line-clamp-2 text-content-secondary"
        >
          {item.metadata.description}
        </Text>
      </div>

      <div className="ml-auto flex max-w-[30%] flex-wrap items-center gap-sm">
        {item.mainnet_package_info_id && (
          <Text
            kind="label"
            size="label-xs"
            className="bg-mainnetSearch rounded-full px-xs text-content-primary"
          >
            {Content.mainnet}
          </Text>
        )}
        {item.testnet_package_info_id && (
          <Text
            kind="label"
            size="label-xs"
            className="bg-testnetSearch rounded-full px-xs text-content-primary"
          >
            {Content.testnet}
          </Text>
        )}
      </div>
    </Link>
  );
}
