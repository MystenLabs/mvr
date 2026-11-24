import { LinkIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Text } from "../ui/Text";
import { isHttpUrl } from "@/lib/utils";

export function SinglePackageSidebarLink({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  return (
    <SinglePackageContent>
      <SinglePackageSidebarTitle>{title}</SinglePackageSidebarTitle>
      {/* These are user-provided (on-chain) values: only link http(s) URLs. */}
      {isHttpUrl(href) ? (
        <Button
          asChild
          variant="linkActive"
          className="flex items-center justify-start gap-2xs whitespace-break-spaces !break-all !px-0 text-left !text-12"
        >
          <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
            <LinkIcon className="mr-2xs h-4 w-4 flex-shrink-0" />
            {href}
          </a>
        </Button>
      ) : (
        <Text kind="paragraph" size="paragraph-small" className="break-all">
          {href}
        </Text>
      )}
    </SinglePackageContent>
  );
}

export function SinglePackageSidebarTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Text
      // A `div`, as titles may contain block elements (e.g. tooltips), which
      // are invalid inside a `p` and break hydration of the server HTML.
      as="div"
      kind="heading"
      size="heading-headline"
      className="mb-xxs flex flex-wrap items-center gap-sm uppercase text-content-secondary"
    >
      {children}
    </Text>
  );
}

export function SinglePackageContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-col gap-sm px-lg">{children}</div>;
}
