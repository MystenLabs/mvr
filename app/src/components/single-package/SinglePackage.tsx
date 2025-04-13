import { ResolvedName } from "@/hooks/mvrResolution";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SinglePackageTabs, Tabs } from "./SinglePackageTabs";
import { SinglePackageSidebar } from "./SinglePackageSidebar";

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
        <div className="grid grid-cols-12 gap-lg md:grid-cols-2 lg:grid-cols-12">
          <SinglePackageTabs
            setActiveTab={updateTab}
            isActiveTab={isActiveTab}
            className="col-span-12 gap-sm max-md:flex max-md:overflow-x-auto md:col-span-2"
          />
          <div className="col-span-12 md:col-span-4 md:col-start-9">
            <SinglePackageSidebar name={name} network={network} />
          </div>
        </div>
      </div>
    </div>
  );
}
