"use client";

import { SearchResult } from "@/hooks/mvrResolution";
import Link from "next/link";

export function SearchResults({
  results,
  hidden = false,
}: {
  hidden?: boolean;
  results: SearchResult;
}) {
  if (!results?.data.length || hidden) return null;

  return (
    <div className="mt-xs border-stroke-secondary bg-bg-quarternaryBleedthrough absolute left-0 top-full z-50 w-full rounded-md border shadow-lg backdrop-blur-sm">
      {results.data.map((item, index) => (
        <Link href={`/package/${item.name}`} key={index}>
          <div
            key={index}
            className="hover:bg-gray-100 cursor-pointer px-4 py-2"
          >
            {item.name}
          </div>
        </Link>
      ))}
    </div>
  );
}
