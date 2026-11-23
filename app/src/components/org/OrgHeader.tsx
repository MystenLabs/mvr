import { OrgAvatar } from "@/components/org/OrgAvatar";
import { OrgBreadcrumb } from "@/components/org/OrgBreadcrumb";
import { PublicNameAvatar } from "@/components/org/PublicNameAvatar";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { isPublicName, ORGS_PATH } from "@/lib/names";

/**
 * The header of an organization page (mirrors `SinglePackageHeader`).
 *
 * A public name (e.g. `@pkg`) is not an organization: its page is presented
 * as a list of public packages, with an explanation.
 */
export function OrgHeader({
  org,
  packagesCount,
  iconUrl,
}: {
  org: string;
  packagesCount: number;
  /** The icon of one of the org's packages, when known (see `OrgAvatar`). */
  iconUrl?: string | null;
}) {
  if (isPublicName(org)) {
    return (
      <div className="container flex flex-col gap-md py-md md:py-lg">
        <Text
          as="div"
          kind="label"
          size="label-small"
          className="text-content-secondary"
        >
          <a
            href={ORGS_PATH}
            className="underline-offset-4 hover:text-content-accent hover:underline"
          >
            ← {Content.publicName.back}
          </a>
        </Text>
        <div className="flex items-center gap-md">
          <PublicNameAvatar className="h-14 w-14" />
          <div className="flex flex-col gap-2xs">
            <Text as="h1" kind="heading" size="heading-regular">
              {Content.publicName.title}{" "}
              <span className="font-normal text-content-secondary">
                ({org})
              </span>
            </Text>
            <Text
              kind="paragraph"
              size="paragraph-xs"
              className="text-content-secondary"
            >
              {Content.publicName.label}
              {" · "}
              {Content.org.packagesCount(packagesCount)}
            </Text>
          </div>
        </div>
        <Text
          kind="paragraph"
          size="paragraph-small"
          className="max-w-[720px] text-content-secondary"
        >
          {Content.publicName.explanation(org)}
        </Text>
      </div>
    );
  }

  return (
    <div className="container flex flex-col gap-md py-md md:py-lg">
      <OrgBreadcrumb org={org} />
      <div className="flex items-center gap-md">
        <OrgAvatar org={org} iconUrl={iconUrl} className="h-14 w-14" />
        <div className="flex flex-col gap-2xs">
          <Text as="h1" kind="heading" size="heading-regular">
            {org}
          </Text>
          <Text
            kind="paragraph"
            size="paragraph-xs"
            className="text-content-secondary"
          >
            {Content.org.packagesCount(packagesCount)}
          </Text>
        </div>
      </div>
    </div>
  );
}
