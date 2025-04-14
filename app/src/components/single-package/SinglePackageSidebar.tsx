import { ResolvedName } from "@/hooks/mvrResolution";
import { Text } from "@/components/ui/Text";
import CodeRenderer from "../homepage/CodeRenderer";
import { LinkIcon } from "lucide-react";
import { Button } from "../ui/button";

export function SinglePackageSidebar({
  name,
  network,
}: {
  name: ResolvedName;
  network: "mainnet" | "testnet";
}) {
  const links = [
    {
      title: "Source Code",
      href: name.git_info?.repository_url ?? "",
    },
    {
      title: "Documentation",
      href: name.metadata?.documentation_url ?? "",
    },
    {
      title: "Homepage",
      href: name.metadata?.homepage_url ?? "",
    },
  ];

  return (
    <div className="sticky">
      <div className="grid grid-cols-1 gap-lg rounded-md bg-bg-secondary px-lg py-lg">
        <SinglePackageContent>
          <SinglePackageSidebarTitle>Install</SinglePackageSidebarTitle>
          <Text kind="paragraph" size="paragraph-small">
            You can install this package in your Move project by calling
          </Text>
          <CodeRenderer
            code={`mvr add ${name.name} --network ${network}`}
            language="bash"
            wrapLines={false}
            wrapLongLines={false}
            className="bg-bg-quarternaryBleedthrough px-0.5 py-2xs"
            codeTagClassName="max-sm:text-11 text-12 "
          />
        </SinglePackageContent>
        <SinglePackageContent>
          <SinglePackageSidebarTitle>Description</SinglePackageSidebarTitle>
          <Text kind="paragraph" size="paragraph-small">
            {name.metadata?.description || "No description provided"}
          </Text>
        </SinglePackageContent>

        {links.map(
          (link) =>
            link.href && (
              <SinglePackageSidebarLink key={link.title} {...link} />
            ),
        )}
      </div>
    </div>
  );
}

function SinglePackageSidebarLink({
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

function SinglePackageSidebarTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Text
      kind="heading"
      size="heading-headline"
      className="mb-xxs flex flex-wrap items-center gap-2xs uppercase text-content-secondary"
    >
      {children}
    </Text>
  );
}

function SinglePackageContent({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-sm">{children}</div>;
}
