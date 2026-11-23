import { ArrowRightIcon } from "lucide-react";
import { OrgAvatar } from "@/components/org/OrgAvatar";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { type OrgSummary } from "@/hooks/useSearchOrgs";
import { getOrgsIfAvailable } from "@/lib/mvr-api";
import { FEATURED_ORGS, isPublicName, orgPath, ORGS_PATH } from "@/lib/names";

/** How many (of the largest) other organizations are listed below. */
const MORE_ORGS_COUNT = 6;

/**
 * The homepage's organizations section: the featured organizations (see
 * `FEATURED_ORGS`), the largest other ones, and a link to all of them.
 *
 * Server-rendered with plain links, and omitted (not an error) when the
 * organizations cannot be loaded. Public names (e.g. `@pkg`) are not
 * organizations: they are listed on the organizations page only.
 */
export async function BrowseOrganizations() {
  const all = await getOrgsIfAvailable();
  if (!all?.length) return null;

  const orgs = all.filter((org) => !isPublicName(org.name));

  const featured = FEATURED_ORGS.map((name) =>
    orgs.find((org) => org.name === name),
  ).filter((org): org is OrgSummary => !!org);

  const more = orgs
    .filter((org) => !FEATURED_ORGS.includes(org.name))
    .slice(0, MORE_ORGS_COUNT);

  return (
    <section className="container">
      <div className="pb-xl max-md:text-center">
        <Text
          as="h2"
          kind="heading"
          size="heading-small"
          className="text-content-accent"
        >
          {Content.orgs.home.title}
        </Text>
        <Text as="p" kind="paragraph" size="paragraph-regular">
          {Content.orgs.home.subtitle}
        </Text>
      </div>

      {featured.length > 0 && (
        <ul className="grid grid-cols-1 gap-lg md:grid-cols-3">
          {featured.map((org) => (
            <li key={org.name} className="min-w-0">
              <FeaturedOrg org={org} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-lg pt-xl md:flex-row md:items-center md:justify-between">
        {more.length > 0 && (
          <nav
            aria-label={Content.orgs.home.more}
            className="flex min-w-0 flex-wrap items-center gap-xs max-md:justify-center"
          >
            {more.map((org) => (
              <a
                key={org.name}
                href={orgPath(org.name)}
                className="flex max-w-full items-center gap-xs rounded-full bg-bg-quarternaryBleedthrough py-2xs pl-2xs pr-sm duration-150 ease-in-out hover:bg-bg-accentBleedthrough2"
              >
                <OrgAvatar
                  org={org.name}
                  iconUrl={org.icon_url}
                  className="h-6 w-6"
                />
                <Text
                  as="span"
                  kind="label"
                  size="label-small"
                  className="truncate text-content-primary"
                >
                  {org.name}
                </Text>
              </a>
            ))}
          </nav>
        )}
        <Button
          asChild
          variant="secondary"
          size="header"
          className="flex-shrink-0 max-md:mx-auto"
        >
          <a href={ORGS_PATH}>{Content.orgs.home.viewAll}</a>
        </Button>
      </div>
    </section>
  );
}

/** A featured organization: a panel linking to its page. */
function FeaturedOrg({ org }: { org: OrgSummary }) {
  return (
    <a
      href={orgPath(org.name)}
      className="group flex h-full items-center gap-md rounded-xl bg-homepageCard px-xl py-lg duration-150 ease-in-out hover:bg-bg-accentBleedthrough3"
    >
      <OrgAvatar org={org.name} iconUrl={org.icon_url} className="h-14 w-14" />
      <div className="min-w-0 flex-grow">
        <Text as="h3" kind="heading" size="heading-xs" className="truncate">
          {org.name}
        </Text>
        <Text
          as="p"
          kind="paragraph"
          size="paragraph-small"
          className="text-content-secondary"
        >
          {Content.org.packagesCount(org.packages)}
        </Text>
      </div>
      <ArrowRightIcon
        aria-hidden
        className="h-5 w-5 flex-shrink-0 text-content-tertiary duration-150 ease-in-out group-hover:translate-x-1 group-hover:text-content-accent"
      />
    </a>
  );
}
