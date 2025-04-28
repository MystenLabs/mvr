import { LinkIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Text } from "../ui/Text";

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
      <Button
        variant="linkActive"
        className="flex items-center justify-start gap-2xs whitespace-break-spaces !break-all !px-0 text-left !text-12"
        onClick={() => window.open(href, "_blank")}
      >
        <LinkIcon className="mr-2xs h-4 w-4 flex-shrink-0" />
        {href}
      </Button>
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
