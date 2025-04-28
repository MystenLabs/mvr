import { ResolvedName } from "@/hooks/mvrResolution";
import { Text } from "@/components/ui/Text";
import CodeRenderer from "../homepage/CodeRenderer";
import { LinkIcon } from "lucide-react";
import { Button } from "../ui/button";
import { SinglePackageAnalytics } from "./SinglePackageAnalytics";
import { SinglePackageSidebarLink } from "./SinglePackageLayout";
import { SinglePackageSidebarTitle } from "./SinglePackageLayout";
import { SinglePackageContent } from "./SinglePackageLayout";

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
      <div className="grid grid-cols-1 gap-lg rounded-md bg-bg-secondary py-lg">
        <SinglePackageContent>
          <SinglePackageSidebarTitle>Install</SinglePackageSidebarTitle>
          <Text kind="paragraph" size="paragraph-small">
            You can install this package in your Move project by calling
          </Text>
          <CodeRenderer
            code={`mvr add ${name.name}`}
            language="bash"
            wrapLines={false}
            wrapLongLines={false}
            className="bg-bg-quarternaryBleedthrough px-0.5 py-2xs"
            codeTagClassName="max-sm:text-11 text-12 "
          />
        </SinglePackageContent>

        <SinglePackageAnalytics name={name} />

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

        {name.metadata?.contact && (
          <SinglePackageContent>
            <SinglePackageSidebarTitle>Contact</SinglePackageSidebarTitle>
            <Text kind="paragraph" size="paragraph-small">
              {name.metadata?.contact}
            </Text>
          </SinglePackageContent>
        )}
      </div>
    </div>
  );
}
