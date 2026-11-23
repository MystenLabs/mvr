"use client";

import { SearchResult, type SearchResultItem } from "@/hooks/mvrResolution";
import Link from "next/link";
import { Text } from "../ui/Text";
import ImageWithFallback from "../ui/image-with-fallback";
import { cn } from "@/lib/utils";
import { Content } from "@/data/content";
import { useIsFocused } from "@/hooks/useIsFocused";
import { type OrgSummary } from "@/hooks/useSearchOrgs";
import { SEARCH_RESULT_ATTRIBUTE } from "@/hooks/useSearchDropdown";
import {
  getOrgFromName,
  isPublicName,
  orgPath,
  packagePath,
} from "@/lib/names";
import { OrgAvatar } from "../org/OrgAvatar";

const rowStyles =
  "relative flex items-center gap-sm px-md py-sm hover:bg-bg-accentBleedthrough3 focus-within:bg-bg-accentBleedthrough3";

/**
 * The link of a row. Its `::after` covers the whole row, so the row is one
 * big click target without wrapping other links (nested links are invalid).
 */
const rowLinkStyles =
  "block rounded-xs after:absolute after:inset-0 after:content-[''] focus-visible:outline-none";

/** Closes the dropdown after a result was picked with the keyboard. */
const blurActiveElement = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

export function SearchResults({
  results,
  orgs = [],
  hidden = false,
}: {
  hidden?: boolean;
  results: SearchResult;
  /** Organizations matching the query, listed above the packages. */
  orgs?: OrgSummary[];
}) {
  const { isFocused, handleFocus, handleBlur } = useIsFocused();

  const hasPackages = !!results?.data.length;
  const hasOrgs = orgs.length > 0;

  if ((!hasPackages && !hasOrgs) || (hidden && !isFocused)) return null;

  const onPick = () => {
    handleBlur();
    blurActiveElement();
  };

  return (
    <div
      className="absolute left-0 top-full z-50 mt-xs max-h-[340px] w-full overflow-y-auto rounded-md border border-stroke-secondary bg-bg-quarternaryBleedthrough shadow-lg backdrop-blur-lg"
      onMouseEnter={handleFocus}
      onMouseLeave={handleBlur}
    >
      {hasOrgs && (
        <>
          <SearchGroupTitle>{Content.search.organizations}</SearchGroupTitle>
          {orgs.map((org) => (
            <OrgSearchResultItem key={org.name} org={org} onPick={onPick} />
          ))}
          {hasPackages && (
            <SearchGroupTitle>{Content.search.packages}</SearchGroupTitle>
          )}
        </>
      )}
      {results?.data.map((item, index) => (
        <SearchResultItem
          key={item.name}
          item={item}
          isLast={index === results.data.length - 1}
          handleBlur={onPick}
          showOrg
        />
      ))}
    </div>
  );
}

function SearchGroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      as="div"
      kind="heading"
      size="heading-headline"
      className="border-b border-stroke-secondary px-md pb-xs pt-sm uppercase text-content-secondary"
    >
      {children}
    </Text>
  );
}

function OrgSearchResultItem({
  org,
  onPick,
}: {
  org: OrgSummary;
  onPick: () => void;
}) {
  return (
    <div
      data-search-row
      className={cn(rowStyles, "border-b border-stroke-secondary")}
    >
      <OrgAvatar org={org.name} iconUrl={org.icon_url} />
      <Link
        href={orgPath(org.name)}
        className={cn(rowLinkStyles, "min-w-0")}
        onClick={onPick}
        {...{ [SEARCH_RESULT_ATTRIBUTE]: "" }}
      >
        <Text
          as="span"
          kind="heading"
          size="heading-3xs"
          className="block truncate text-content-primary"
        >
          {org.name}
        </Text>
      </Link>
      <Text
        as="span"
        kind="paragraph"
        size="paragraph-xs"
        className="ml-auto flex-shrink-0 text-content-secondary"
      >
        {Content.org.packagesCount(org.packages)}
      </Text>
    </div>
  );
}

export function SearchResultItem({
  item,
  isLast,
  handleBlur,
  showOrg = false,
}: {
  item: SearchResultItem;
  isLast: boolean;
  handleBlur?: () => void;
  /** Adds a (separate) link to the organization of the package. */
  showOrg?: boolean;
}) {
  const org = getOrgFromName(item.name);

  return (
    <div
      data-search-row
      className={cn(rowStyles, !isLast && "border-b border-stroke-secondary")}
    >
      <div className="max-w-[10%] flex-shrink-0">
        <ImageWithFallback
          key={item.metadata.icon_url}
          src={item.metadata.icon_url}
          alt=""
          className="h-8 w-8 rounded-sm"
          fallback={`/default-icon.svg`}
        />
      </div>
      <div className="min-w-0 max-w-[50%]">
        <Link
          href={packagePath(item.name)}
          className={rowLinkStyles}
          onClick={() => {
            handleBlur?.();
          }}
          {...{ [SEARCH_RESULT_ATTRIBUTE]: "" }}
        >
          <Text
            as="span"
            kind="heading"
            size="heading-3xs"
            className="block text-content-primary"
          >
            {item.name}
          </Text>
        </Link>
        <Text
          kind="paragraph"
          size="paragraph-xs"
          className="line-clamp-2 text-content-secondary"
        >
          {item.metadata.description}
        </Text>
      </div>

      <div className="ml-auto flex max-w-[40%] flex-col items-end gap-xs">
        <div className="flex flex-wrap items-center justify-end gap-xs">
          {item.mainnet_package_info_id && (
            <Text
              kind="label"
              size="label-xs"
              className="rounded-full bg-mainnetSearch px-xs text-content-primary"
            >
              {Content.mainnet}
            </Text>
          )}
          {item.testnet_package_info_id && (
            <Text
              kind="label"
              size="label-xs"
              className="rounded-full bg-testnetSearch px-xs text-content-primary"
            >
              {Content.testnet}
            </Text>
          )}
        </div>
        {showOrg &&
          (isPublicName(org) ? (
            // A public name is not an organization: a label, not a link.
            <Text
              as="span"
              kind="label"
              size="label-xs"
              className="text-content-tertiary"
            >
              {Content.publicName.label}
            </Text>
          ) : (
            // Above the row link's `::after`, so it gets its own clicks.
            <Link
              href={orgPath(org)}
              title={Content.org.viewOrg(org)}
              aria-label={Content.org.viewOrg(org)}
              className="relative z-10 max-w-full rounded-xs text-content-secondary underline-offset-4 hover:text-content-accent hover:underline focus-visible:text-content-accent focus-visible:underline focus-visible:outline-none"
              onClick={() => {
                handleBlur?.();
              }}
            >
              <Text
                as="span"
                kind="label"
                size="label-xs"
                className="block truncate"
              >
                {Content.org.by(org)}
              </Text>
            </Link>
          ))}
      </div>
    </div>
  );
}
