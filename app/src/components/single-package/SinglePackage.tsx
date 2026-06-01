import { ResolvedName } from "@/hooks/mvrResolution";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DependencyCount,
  DependentsCountLabel,
  SinglePackageTabs,
  NameTotalDependentsCount,
} from "./SinglePackageTabs";
import { SinglePackageSidebar } from "./SinglePackageSidebar";
import { ReadMeRenderer } from "./ReadMeRenderer";
import { SinglePackageDependencies } from "./SinglePackageDependencies";
import { SinglePackageDependents } from "./SinglePackageDependents";
import { SinglePackageVersions } from "./SinglePackageVersions";
import {
  SinglePackageTrustSignals,
  TrustSignalCount,
} from "./SinglePackageTrustSignals";
import {
  SinglePackageIssued,
  IssuedCount,
} from "./SinglePackageIssued";
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
import { attestationConfig, isConfiguredAttestor } from "@/lib/attestations";

// Simple shield-check glyph for the Trust Signals tab; reused for both states.
const TrustSignalsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

// Upload/outbox glyph for the Issued tab (attestations this package emits).
const IssuedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    <path d="M12 15V3" />
    <path d="M7 8l5-5 5 5" />
  </svg>
);

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
    label: (
      _address: string,
      network: "mainnet" | "testnet",
      name?: ResolvedName,
    ) => <NameTotalDependentsCount name={name!.name} network={network} />,
    component: (name: ResolvedName) => <SinglePackageDependents name={name} />,
  },
  {
    key: "trust-signals",
    title: "Security",
    selectedIcon: <TrustSignalsIcon />,
    unselectedIcon: <TrustSignalsIcon />,
    label: (address: string, network: "mainnet" | "testnet") => (
      <TrustSignalCount address={address} network={network} />
    ),
    component: (name: ResolvedName) => <SinglePackageTrustSignals name={name} />,
  },
  {
    key: "issued",
    title: "Issued",
    selectedIcon: <IssuedIcon />,
    unselectedIcon: <IssuedIcon />,
    label: (address: string, network: "mainnet" | "testnet") => (
      <IssuedCount address={address} network={network} />
    ),
    component: (name: ResolvedName) => <SinglePackageIssued name={name} />,
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

  // The "Issued" tab only applies to attesters — gate it on whitelist
  // membership (a free in-memory check) rather than probing every package.
  const cfg = attestationConfig();
  const visibleTabs =
    cfg && isConfiguredAttestor(cfg, name.package_address)
      ? Tabs
      : Tabs.filter((t) => t.key !== "issued");

  const [activeTab, setActiveTab] = useState(visibleTabs[0]!.key);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && visibleTabs.some((t) => t.key === tab) && tab !== activeTab) {
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
            tabs={visibleTabs}
            name={name}
            setActiveTab={updateTab}
            isActiveTab={isActiveTab}
            className="col-span-1 gap-sm max-lg:flex max-lg:overflow-x-auto lg:col-span-5 2xl:col-span-4"
          />
          <div className="col-span-1 lg:col-span-12 2xl:col-span-13">
            {visibleTabs.find((t) => t.key === activeTab)?.component(name)}
          </div>
          <div className="relative col-span-1 lg:col-span-7">
            <SinglePackageSidebar name={name} network={network} />
          </div>
        </div>
      </div>
    </div>
  );
}
