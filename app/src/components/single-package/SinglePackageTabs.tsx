import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/Text";
import {
  useGetMvrDependencies,
  useGetMvrDependents,
} from "@/hooks/useMvrDependencies";
import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import { SinglePackageTab } from "@/utils/types";

export function SinglePackageTabs({
  name,
  setActiveTab,
  isActiveTab,
  className,
  tabs,
}: {
  name: ResolvedName;
  setActiveTab: (tab: string) => void;
  isActiveTab: (tab: string) => boolean;
  className?: string;
  tabs: SinglePackageTab[];
}) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";

  return (
    <div className={className}>
      {tabs.map((tab) => (
        <div
          key={tab.title}
          className={cn(
            "flex flex-shrink-0 cursor-pointer items-center gap-sm rounded-sm px-md py-sm hover:bg-bg-accentBleedthrough3 lg:w-full",
            isActiveTab(tab.key) && "bg-bg-accentBleedthrough2",
            tab.disabled && "opacity-50 hover:bg-transparent",
          )}
          onClick={() => {
            if (tab.disabled) return;
            setActiveTab(tab.key);
          }}
        >
          <div className="flex h-[14px] w-[14px] items-center justify-center">
            {isActiveTab(tab.key) ? tab.selectedIcon : tab.unselectedIcon}
          </div>
          <Text kind="label" size="label-small">
            {tab.title}
          </Text>
          {tab.comingSoon && (
            <Text
              kind="label"
              size="label-2xs"
              className="ml-auto rounded-sm text-content-accent"
            >
              On the way
            </Text>
          )}
          {tab.label && tab.label(name.package_address, network, name)}
        </div>
      ))}
    </div>
  );
}

export function DependencyCount({
  address,
  network,
  className,
}: {
  address: string;
  network: "mainnet" | "testnet";
  className?: string;
}) {
  const { data: dependencies } = useGetMvrDependencies(address, network);

  return (
    <DependentsCountLabel
      count={dependencies?.length ?? 0}
      className={className}
    />
  );
}

export function DependentsCount({
  address,
  network,
  className,
}: {
  address: string;
  network: "mainnet" | "testnet";
  className?: string;
}) {
  const { data: dependents } = useGetMvrDependents(address, network);

  return (
    <DependentsCountLabel
      count={dependents?.total ?? 0}
      className={className}
    />
  );
}

export function DependentsCountLabel({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-full bg-bg-quarternaryBleedthrough px-xs py-2xs",
        className,
      )}
    >
      <Text kind="label" size="label-2xs">
        {count}
      </Text>
    </div>
  );
}
