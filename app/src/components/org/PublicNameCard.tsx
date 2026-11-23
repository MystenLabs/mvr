import { PublicNameAvatar } from "@/components/org/PublicNameAvatar";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { type OrgSummary } from "@/hooks/useSearchOrgs";
import { orgPath } from "@/lib/names";
import { cn } from "@/lib/utils";

/**
 * The entry of a public name (e.g. `@pkg`) next to the organizations: it is
 * deliberately not an `OrgCard`, as a public name is not an organization.
 */
export function PublicNameCard({
  name,
  className,
}: {
  name: OrgSummary;
  className?: string;
}) {
  return (
    <a
      href={orgPath(name.name)}
      className={cn(
        "flex items-center gap-sm rounded-md border border-dashed border-stroke-primary px-md py-sm duration-150 ease-in-out hover:border-stroke-accent hover:bg-bg-accentBleedthrough3",
        className,
      )}
    >
      <PublicNameAvatar className="h-10 w-10" />
      <div className="min-w-0">
        <Text
          as="div"
          kind="heading"
          size="heading-3xs"
          className="text-content-primary"
        >
          {Content.publicName.title}{" "}
          <span className="font-normal text-content-secondary">
            ({name.name})
          </span>
        </Text>
        <Text
          as="div"
          kind="paragraph"
          size="paragraph-xs"
          className="text-content-secondary"
        >
          {Content.org.packagesCount(name.packages)}
          {" · "}
          {Content.publicName.short}
        </Text>
      </div>
    </a>
  );
}
