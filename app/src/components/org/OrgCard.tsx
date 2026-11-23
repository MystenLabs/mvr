import { OrgAvatar } from "@/components/org/OrgAvatar";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { type OrgSummary } from "@/hooks/useSearchOrgs";
import { orgPath } from "@/lib/names";
import { cn } from "@/lib/utils";

/**
 * A card linking to an organization page. A plain `<a>`, so that it works
 * (and is crawlable) without JavaScript.
 */
export function OrgCard({
  org,
  className,
}: {
  org: OrgSummary;
  className?: string;
}) {
  return (
    <a
      href={orgPath(org.name)}
      className={cn(
        "flex items-center gap-sm rounded-md border border-stroke-secondary bg-bg-quarternaryBleedthrough px-md py-sm duration-150 ease-in-out hover:border-stroke-accent hover:bg-bg-accentBleedthrough3",
        className,
      )}
    >
      <OrgAvatar org={org.name} iconUrl={org.icon_url} className="h-10 w-10" />
      <div className="min-w-0">
        <Text
          as="div"
          kind="heading"
          size="heading-3xs"
          className="truncate text-content-primary"
        >
          {org.name}
        </Text>
        <Text
          as="div"
          kind="paragraph"
          size="paragraph-xs"
          className="text-content-secondary"
        >
          {Content.org.packagesCount(org.packages)}
        </Text>
      </div>
    </a>
  );
}
