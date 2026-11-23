import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { ORGS_PATH } from "@/lib/names";

/** `Organizations / @org`: the way back from an org page to the directory. */
export function OrgBreadcrumb({ org }: { org: string }) {
  return (
    <nav aria-label={Content.org.breadcrumb}>
      <Text
        as="ol"
        kind="label"
        size="label-small"
        className="flex flex-wrap items-center gap-xs text-content-secondary"
      >
        <li>
          <a
            href={ORGS_PATH}
            className="underline-offset-4 hover:text-content-accent hover:underline"
          >
            {Content.orgs.title}
          </a>
        </li>
        <li aria-hidden className="text-content-tertiary">
          /
        </li>
        <li aria-current="page" className="text-content-primary">
          {org}
        </li>
      </Text>
    </nav>
  );
}
