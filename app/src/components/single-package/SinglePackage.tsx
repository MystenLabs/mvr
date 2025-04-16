import { ResolvedName } from "@/hooks/mvrResolution";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SinglePackageTabs, Tabs } from "./SinglePackageTabs";
import { SinglePackageSidebar } from "./SinglePackageSidebar";
import { ReadMeRenderer } from "./ReadMeRenderer";
import { SinglePackageDependencies } from "./SinglePackageDependencies";
import { SinglePackageDependents } from "./SinglePackageDependents";

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
        <div className="lg:grid-cols-24 grid grid-cols-1 gap-2xl">
          <SinglePackageTabs
            name={name}
            setActiveTab={updateTab}
            isActiveTab={isActiveTab}
            className="col-span-1 gap-sm max-lg:flex max-lg:overflow-x-auto lg:col-span-5 2xl:col-span-4"
          />
          <div className="lg:col-span-12 2xl:col-span-13 col-span-1">
            {isActiveTab("readme") && <ReadMeRenderer name={name} />}
            {isActiveTab("dependencies") && (
              <SinglePackageDependencies name={name} />
            )}
            {isActiveTab("dependents") && (
              <SinglePackageDependents name={name} />
            )}
          </div>
          <div className="relative col-span-1 lg:col-span-7">
            <SinglePackageSidebar name={name} network={network} />
          </div>
        </div>
      </div>
    </div>
  );
}
