import Link from "next/link";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { orgPath } from "@/lib/names";
import { cn } from "@/lib/utils";

const linkStyles =
  "rounded-sm px-sm py-xs hover:bg-bg-accentBleedthrough3 text-content-secondary";

/**
 * Plain-link pagination: every page is linked from every other page, so all
 * the packages of an org are reachable by crawlers without JavaScript.
 */
export function OrgPagination({
  org,
  page,
  totalPages,
}: {
  org: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label={Content.org.pagination}
      className="flex flex-wrap items-center justify-center gap-2xs pt-sm"
    >
      {page > 1 && (
        <Link href={orgPath(org, page - 1)} rel="prev" className={linkStyles}>
          <Text as="span" kind="label" size="label-small">
            {Content.org.previous}
          </Text>
        </Link>
      )}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={orgPath(org, p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            linkStyles,
            p === page && "bg-bg-accentBleedthrough2 text-content-primary",
          )}
        >
          <Text as="span" kind="label" size="label-small">
            {p}
          </Text>
        </Link>
      ))}
      {page < totalPages && (
        <Link href={orgPath(org, page + 1)} rel="next" className={linkStyles}>
          <Text as="span" kind="label" size="label-small">
            {Content.org.next}
          </Text>
        </Link>
      )}
    </nav>
  );
}
