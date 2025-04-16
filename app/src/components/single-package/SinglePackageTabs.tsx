import { DependendsIconUnselected } from "@/icons/single-package/DependendsIcon";
import { DependendsIconSelected } from "@/icons/single-package/DependendsIcon";
import { DependenciesIconSelected } from "@/icons/single-package/DependenciesIcon";
import { ReadMeIconUnselected } from "@/icons/single-package/ReadMeIcon";
import { DependenciesIconUnselected } from "@/icons/single-package/DependenciesIcon";
import { ReadMeIconSelected } from "@/icons/single-package/ReadMeIcon";
import { VersionsIconUnselected } from "@/icons/single-package/VersionsIcon";
import { VersionsIconSelected } from "@/icons/single-package/VersionsIcon";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/Text";
import {
  useGetMvrDependencies,
  useGetMvrDependents,
} from "@/hooks/useMvrDependencies";
import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";

export const Tabs = [
  {
    key: "readme",
    title: "Readme",
    selectedIcon: <ReadMeIconSelected />,
    unselectedIcon: <ReadMeIconUnselected />,
    label: null,
  },
  {
    key: "versions",
    title: "Versions",
    selectedIcon: <VersionsIconSelected />,
    unselectedIcon: <VersionsIconUnselected />,
  },
  {
    key: "dependencies",
    title: "Dependencies",
    selectedIcon: <DependenciesIconSelected />,
    unselectedIcon: <DependenciesIconUnselected />,
    label: (name: ResolvedName, network: "mainnet" | "testnet") => (
      <DependencyCount name={name} network={network} />
    ),
  },
  {
    key: "dependents",
    title: "Dependents",
    selectedIcon: <DependendsIconSelected />,
    unselectedIcon: <DependendsIconUnselected />,
    label: (name: ResolvedName, network: "mainnet" | "testnet") => (
      <DependentsCount name={name} network={network} />
    ),
  },
];

export type SinglePackageTab = (typeof Tabs)[number];

export function SinglePackageTabs({
  name,
  setActiveTab,
  isActiveTab,
  className,
}: {
  name: ResolvedName;
  setActiveTab: (tab: string) => void;
  isActiveTab: (tab: string) => boolean;
  className?: string;
}) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";

  const { data: dependencies } = useGetMvrDependencies(
    name.package_address,
    network,
  );

  return (
    <div className={className}>
      {Tabs.map((tab) => (
        <div
          key={tab.title}
          className={cn(
            "flex flex-shrink-0 cursor-pointer items-center gap-sm rounded-sm px-md py-sm hover:bg-bg-accentBleedthrough3 lg:w-full",
            isActiveTab(tab.key) && "bg-bg-accentBleedthrough2",
          )}
          onClick={() => setActiveTab(tab.key)}
        >
          <div className="flex h-[14px] w-[14px] items-center justify-center">
            {isActiveTab(tab.key) ? tab.selectedIcon : tab.unselectedIcon}
          </div>
          <Text kind="label" size="label-small">
            {tab.title}
          </Text>
          {tab.label && tab.label(name, network)}
        </div>
      ))}
    </div>
  );
}

export function DependencyCount({
  name,
  network,
}: {
  name: ResolvedName;
  network: "mainnet" | "testnet";
}) {
  const { data: dependencies } = useGetMvrDependencies(
    name.package_address,
    network,
  );

  return (
    <DependentsCountLabel count={dependencies?.length ?? 0} hasMore={false} />
  );
}

export function DependentsCount({
  name,
  network,
}: {
  name: ResolvedName;
  network: "mainnet" | "testnet";
}) {
  const { data: dependents } = useGetMvrDependents(
    name.package_address,
    network,
  );

  return (
    <DependentsCountLabel
      count={dependents?.packages.length ?? 0}
      hasMore={dependents?.hasMore ?? false}
    />
  );
}

function DependentsCountLabel({
  count,
  hasMore,
}: {
  count: number;
  hasMore: boolean;
}) {
  return (
    <div className="bg-bg-quarternaryBleedthrough rounded-full px-xs py-2xs">
      <Text kind="label" size="label-2xs">
        {count}{hasMore ? "+" : ""}
      </Text>
    </div>
  );
}
