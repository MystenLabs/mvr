"use client";

import { useState } from "react";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { OrgCard } from "@/components/org/OrgCard";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { type OrgSummary } from "@/hooks/useSearchOrgs";

/**
 * The directory of organizations, with an (in-memory) name filter.
 * All the organizations are part of the server-rendered HTML.
 */
export function OrgsDirectory({
  orgs,
  children,
}: {
  /** The organizations (public names, e.g. `@pkg`, are not organizations). */
  orgs: OrgSummary[];
  /** Rendered between the filter and the organizations. */
  children?: React.ReactNode;
}) {
  const [filter, setFilter] = useState("");

  const query = filter.trim().toLowerCase();
  const visible = query ? orgs.filter((org) => org.name.includes(query)) : orgs;

  return (
    <div className="grid grid-cols-1 gap-lg">
      <div className="flex w-full items-center rounded-sm bg-bg-quarternaryBleedthrough px-sm py-xs text-content-secondary md:max-w-[400px]">
        <MagnifyingGlassIcon className="mr-2 h-5 w-5 shrink-0 opacity-50" />
        <Input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="!leading-16 flex h-full w-full rounded-none !border-none bg-transparent !p-0 !text-16 !outline-none !ring-0 placeholder:font-light placeholder:text-content-tertiary placeholder:opacity-100"
          placeholder={Content.orgs.filterPlaceholder}
          aria-label={Content.orgs.filterPlaceholder}
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {children}

      {visible.length > 0 ? (
        <ul className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((org) => (
            <li key={org.name} className="min-w-0">
              <OrgCard org={org} />
            </li>
          ))}
        </ul>
      ) : (
        <Text
          kind="paragraph"
          size="paragraph-regular"
          className="py-2xl text-center text-content-secondary"
        >
          {Content.orgs.noResults(filter.trim())}
        </Text>
      )}
    </div>
  );
}
