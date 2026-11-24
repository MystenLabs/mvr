import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImageWithFallback from "@/components/ui/image-with-fallback";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { type PackageOrgContext } from "@/lib/mvr-api";
import { orgPath, packagePath } from "@/lib/names";
import { isHttpUrl } from "@/lib/utils";
import {
  SinglePackageContent,
  SinglePackageSidebarTitle,
} from "./SinglePackageLayout";

/**
 * A few other packages of the same organization, and a link to all of them.
 * Renders nothing when the organization has no other (known) packages.
 */
export function MoreFromOrg({ org }: { org: PackageOrgContext }) {
  if (!org.otherPackages.length) return null;

  return (
    <div className="rounded-md bg-bg-secondary py-lg">
      <SinglePackageContent>
        <SinglePackageSidebarTitle>
          {Content.org.moreFrom(org.org)}
        </SinglePackageSidebarTitle>
        <ul className="-mx-sm grid grid-cols-1">
          {org.otherPackages.map((item) => (
            <li key={item.name}>
              <Link
                href={packagePath(item.name)}
                className="flex items-center gap-sm rounded-sm px-sm py-xs hover:bg-bg-accentBleedthrough3"
              >
                <ImageWithFallback
                  key={item.metadata?.icon_url}
                  src={
                    isHttpUrl(item.metadata?.icon_url)
                      ? item.metadata.icon_url
                      : undefined
                  }
                  alt=""
                  loading="lazy"
                  className="h-8 w-8 flex-shrink-0 rounded-sm"
                />
                <span className="min-w-0">
                  <Text
                    as="span"
                    kind="heading"
                    size="heading-3xs"
                    className="block truncate text-content-primary"
                  >
                    {item.name}
                  </Text>
                  {item.metadata?.description && (
                    <Text
                      as="span"
                      kind="paragraph"
                      size="paragraph-xs"
                      className="line-clamp-1 text-content-secondary"
                    >
                      {item.metadata.description}
                    </Text>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Button
          asChild
          variant="linkActive"
          className="flex items-center justify-start gap-2xs !px-0 text-left !text-12"
        >
          <Link href={orgPath(org.org)}>
            {Content.org.viewAll(org.org, org.packagesCount)}
            <ArrowRightIcon className="h-4 w-4 flex-shrink-0" />
          </Link>
        </Button>
      </SinglePackageContent>
    </div>
  );
}
