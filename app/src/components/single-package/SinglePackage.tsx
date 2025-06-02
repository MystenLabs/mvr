import { ResolvedName } from "@/hooks/mvrResolution";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DependencyCount,
  DependentsCountLabel,
  SinglePackageTabs,
} from "./SinglePackageTabs";
import { SinglePackageSidebar } from "./SinglePackageSidebar";
import { ReadMeRenderer } from "./ReadMeRenderer";
import { SinglePackageDependencies } from "./SinglePackageDependencies";
import { SinglePackageDependents } from "./SinglePackageDependents";
import { SinglePackageVersions } from "./SinglePackageVersions";
import { DependenciesIconSelected } from "@/icons/single-package/DependenciesIcon";
import { DependendsIconSelected } from "@/icons/single-package/DependendsIcon";
import { DependenciesIconUnselected } from "@/icons/single-package/DependenciesIcon";
import { DependendsIconUnselected } from "@/icons/single-package/DependendsIcon";
import { VersionsIconUnselected } from "@/icons/single-package/VersionsIcon";
import { VersionsIconSelected } from "@/icons/single-package/VersionsIcon";
import { ReadMeIconSelected } from "@/icons/single-package/ReadMeIcon";
import { ReadMeIconUnselected } from "@/icons/single-package/ReadMeIcon";
import { SinglePackageTab } from "@/utils/types";
import { AnalyticsIconUnselected } from "@/icons/single-package/AnalyticsIcon";
import { AnalyticsIconSelected } from "@/icons/single-package/AnalyticsIcon";

export const Tabs: SinglePackageTab[] = [
  {
    key: "readme",
    title: "Readme",
    selectedIcon: <ReadMeIconSelected />,
    unselectedIcon: <ReadMeIconUnselected />,
    component: (name: ResolvedName) => <ReadMeRenderer name={name} />,
  },
  {
    key: "versions",
    title: "Versions",
    label: (
      _address: string,
      _network: "mainnet" | "testnet",
      name?: ResolvedName,
    ) => <DependentsCountLabel count={name?.version ?? 0} />,
    selectedIcon: <VersionsIconSelected />,
    unselectedIcon: <VersionsIconUnselected />,
    component: (name: ResolvedName) => <SinglePackageVersions name={name} />,
  },
  {
    key: "dependencies",
    title: "Dependencies",
    selectedIcon: <DependenciesIconSelected />,
    unselectedIcon: <DependenciesIconUnselected />,
    label: (address: string, network: "mainnet" | "testnet") => (
      <DependencyCount address={address} network={network} />
    ),
    component: (name: ResolvedName) => (
      <SinglePackageDependencies name={name} />
    ),
  },
  {
    key: "dependents",
    title: "Dependents",
    selectedIcon: <DependendsIconSelected />,
    unselectedIcon: <DependendsIconUnselected />,
    // label: (address: string, network: "mainnet" | "testnet") => (
    //   <DependentsCount address={address} network={network} />
    // ),
    component: (name: ResolvedName) => <SinglePackageDependents name={name} />,
  },
  {
    key: "analytics",
    title: "Analytics",
    selectedIcon: <AnalyticsIconSelected />,
    unselectedIcon: <AnalyticsIconUnselected />,
    component: (name: ResolvedName) => null,
    disabled: true,
    comingSoon: true,
  },
];

export function SinglePackage({
  name,
  network,
}: {
  name: ResolvedName;
  network: "mainnet" | "testnet";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(Tabs[0]!.key);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && Tabs.some((t) => t.key === tab) && tab !== activeTab) {
      setActiveTab(tab as string);
    }
  }, [searchParams]);

  const updateTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.replace(`?${params.toString()}`);
    setActiveTab(tab);
  };

  const isActiveTab = (tab: string) => tab === activeTab;

  return (
    <div className="flex-grow">
      <div className="container">
        <div className="grid grid-cols-1 gap-2xl lg:grid-cols-24">
          <SinglePackageTabs
            tabs={Tabs}
            name={name}
            setActiveTab={updateTab}
            isActiveTab={isActiveTab}
            className="col-span-1 gap-sm max-lg:flex max-lg:overflow-x-auto lg:col-span-5 2xl:col-span-4"
          />
          <div className="col-span-1 lg:col-span-12 2xl:col-span-13">
            {Tabs.find((t) => t.key === activeTab)?.component(name)}
          </div>
          <div className="relative col-span-1 lg:col-span-7">
            <SinglePackageSidebar name={name} network={network} />
          </div>
        </div>
      </div>
    </div>
  );
}
