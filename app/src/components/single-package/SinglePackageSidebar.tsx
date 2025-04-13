import { ResolvedName } from "@/hooks/mvrResolution";
import { Text } from "@/components/ui/Text";
import CodeRenderer from "../homepage/CodeRenderer";

export function SinglePackageSidebar({
  name,
  network,
}: {
  name: ResolvedName;
  network: "mainnet" | "testnet";
}) {
  return (
    <div className="grid grid-cols-1 gap-lg rounded-md bg-bg-secondary px-lg py-lg">
      <SinglePackageContent>
        <SinglePackageSidebarTitle>Install</SinglePackageSidebarTitle>
        <Text kind="paragraph" size="paragraph-small">
          You can install this package in your Move project by calling
        </Text>
        <CodeRenderer
          code={`mvr add ${name.name} --network ${network}`}
          language="bash"
          className="bg-bg-quarternaryBleedthrough"
          codeTagClassName="max-sm:text-12 text-13"
        />
      </SinglePackageContent>
      <SinglePackageContent>
        <SinglePackageSidebarTitle>Version</SinglePackageSidebarTitle>
        <Text kind="paragraph" size="paragraph-small">
          {name.version}
        </Text>
      </SinglePackageContent>
      <SinglePackageContent>
        <SinglePackageSidebarTitle>Description</SinglePackageSidebarTitle>
        <Text kind="paragraph" size="paragraph-small">
          {name.metadata?.description || "No description provided"}
        </Text>
      </SinglePackageContent>
    </div>
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
      className="mb-xxs uppercase text-content-secondary"
    >
      {children}
    </Text>
  );
}

function SinglePackageContent({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-sm">{children}</div>;
}
