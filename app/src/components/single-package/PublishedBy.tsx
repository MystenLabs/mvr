import Link from "next/link";
import { OrgAvatar } from "@/components/org/OrgAvatar";
import { PublicNameAvatar } from "@/components/org/PublicNameAvatar";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { isPublicName, orgPath } from "@/lib/names";

const chipStyles =
  "group flex w-fit max-w-full flex-shrink-0 items-center gap-sm rounded-md border px-sm py-xs duration-150 ease-in-out hover:border-stroke-accent hover:bg-bg-accentBleedthrough3";

/**
 * The labelled link from a package to the organization that published it.
 *
 * Packages under a public name (e.g. `@pkg`) have no such organization: they
 * get a neutral "Public name" chip, linking to the public packages.
 */
export function PublishedBy({
  org,
  iconUrl,
  packagesCount,
}: {
  org: string;
  /** The icon of one of the org's packages, when known. */
  iconUrl?: string | null;
  /** The number of packages of the org, when known. */
  packagesCount?: number | null;
}) {
  const isPublic = isPublicName(org);

  return (
    <Link
      href={orgPath(org)}
      className={
        isPublic
          ? `${chipStyles} border-dashed border-stroke-primary`
          : `${chipStyles} border-stroke-secondary bg-bg-quarternaryBleedthrough`
      }
    >
      {isPublic ? (
        <PublicNameAvatar />
      ) : (
        <OrgAvatar org={org} iconUrl={iconUrl} />
      )}
      <span className="flex min-w-0 flex-col gap-2xs">
        <Text
          as="span"
          kind="label"
          size="label-xs"
          className="text-content-secondary"
        >
          {isPublic ? Content.publicName.label : Content.org.publishedBy}
        </Text>
        <Text
          as="span"
          kind="heading"
          size="heading-3xs"
          className="truncate text-content-primary group-hover:text-content-accent"
        >
          {isPublic ? Content.publicName.browse : org}
          {!isPublic && !!packagesCount && packagesCount > 1 && (
            <span className="font-normal text-content-secondary">
              {" · "}
              {Content.org.packagesCount(packagesCount)}
            </span>
          )}
        </Text>
      </span>
    </Link>
  );
}
