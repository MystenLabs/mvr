import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { OrgHeader } from "@/components/org/OrgHeader";
import { OrgPagination } from "@/components/org/OrgPagination";
import { SearchResultItem } from "@/components/public/SearchResults";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { getOrgNames, getOrgsIfAvailable, ORG_PAGE_SIZE } from "@/lib/mvr-api";
import { isPublicName, orgPath, parseOrgSegment } from "@/lib/names";
import { isHttpUrl } from "@/lib/utils";

type Props = {
  params: { org: string };
  searchParams: { page?: string | string[] };
};

/** Parses `?page=`: a missing param is page 1, anything invalid is `null`. */
const parsePage = (page: Props["searchParams"]["page"]) => {
  if (page === undefined) return 1;
  if (typeof page !== "string" || !/^[1-9]\d{0,5}$/.test(page)) return null;
  return Number(page);
};

/**
 * Loads the org's packages and the requested page of them.
 * Returns `null` (the page then 404s) on: an invalid org, an org without packages, an out of range page, or
 * an API that does not support the `org` filter (see `getOrgNames`).
 */
async function loadOrgPage({ params, searchParams }: Props) {
  const org = parseOrgSegment(params.org);
  const page = parsePage(searchParams.page);
  if (!org || !page) return null;

  // The org listing only provides the avatar: it is optional (never throws).
  const [result, orgs] = await Promise.all([
    getOrgNames(org),
    getOrgsIfAvailable(),
  ]);

  if (result.status === "unsupported") {
    console.warn(
      `[org] The MVR API returned names outside of "${org}": the "org" filter is not supported by this API. Responding with 404.`,
    );
    return null;
  }

  const { names } = result;
  const totalPages = Math.ceil(names.length / ORG_PAGE_SIZE);
  if (names.length === 0 || page > totalPages) return null;

  return {
    org,
    page,
    totalPages,
    total: names.length,
    // Never for a public name (`@pkg`): see `OrgAvatar`.
    iconUrl: isPublicName(org)
      ? null
      : (orgs?.find((x) => x.name === org)?.icon_url ?? null),
    items: names.slice((page - 1) * ORG_PAGE_SIZE, page * ORG_PAGE_SIZE),
  };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const data = await loadOrgPage(props);
  // `notFound()` is called from the page. On a dynamic route Next.js 14
  // answers it with a 404 status and an EMPTY server-rendered <body>
  // (`not-found.tsx` is only rendered on the client), so this metadata is
  // all that a crawler gets from a missing page.
  if (!data) {
    return { title: Content.notFound.title, robots: { index: false } };
  }

  const { org, page, total, iconUrl } = data;

  // A public name (e.g. `@pkg`) is not an organization (see `isPublicName`).
  const seo = isPublicName(org) ? Content.seo.publicName : Content.seo.org;
  const title = seo.title(org, page);
  const description = seo.description(org, total);
  // Each page lists different packages, so paginated pages are
  // self-canonical (`?page=1` canonicalizes to the bare URL).
  const canonical = orgPath(org, page);
  const images = isHttpUrl(iconUrl ?? undefined)
    ? [{ url: iconUrl! }]
    : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: Content.seo.siteName,
      title: `${title} | ${Content.seo.siteName}`,
      description,
      url: canonical,
      images,
    },
    twitter: {
      card: "summary",
      title: `${title} | ${Content.seo.siteName}`,
      description,
      images,
    },
  };
}

export default async function OrgPage(props: Props) {
  const data = await loadOrgPage(props);
  if (!data) notFound();

  const { org, page, totalPages, total, items, iconUrl } = data;

  return (
    <>
      <Header>
        <OrgHeader org={org} packagesCount={total} iconUrl={iconUrl} />
      </Header>
      <div className="flex-grow">
        <div className="container py-lg">
          <div className="overflow-hidden rounded-md border border-stroke-secondary bg-bg-quarternaryBleedthrough">
            {items.map((item, index) => (
              <SearchResultItem
                key={item.name}
                item={item}
                isLast={index === items.length - 1}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <Text
              kind="paragraph"
              size="paragraph-xs"
              className="pt-lg text-center text-content-secondary"
            >
              {Content.org.pageOf(page, totalPages)}
            </Text>
          )}
          <OrgPagination org={org} page={page} totalPages={totalPages} />
        </div>
      </div>
    </>
  );
}
