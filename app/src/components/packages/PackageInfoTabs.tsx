import { PackageInfo } from "@/hooks/useGetPackageInfoObjects";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";
import { TabTitle } from "../ui/TabTitle";
import { Text } from "../ui/Text";
import { useMemo, useState } from "react";
import { useVersionsTable } from "@/hooks/useVersionsTable";
import { Network } from "@/utils/types";
import { usePackagesNetwork } from "../providers/packages-provider";
import { OpenInNewWindowIcon } from "@radix-ui/react-icons";
import { PackageVersions } from "./PackageVersions";

const Tabs = [
  {
    key: "source-code",
    title: "Source Code",
  },
  {
    key: "metadata",
    title: "Metadata",
  },
  {
    key: "view-on-explorer",
    title: "Explorer",
    url: (objectId: string, network: Network) =>
      `https://suiexplorer.com/object/${objectId}?network=${network}`,
  },
];

export function PackageInfoTabs({ packageInfo }: { packageInfo: PackageInfo }) {
  const [activeTab, setActiveTab] = useState(Tabs[0]!.key);
  const network = usePackagesNetwork();

  return (
    <div>
      <div className="border-b border-border-classic flex items-center overflow-x-auto">
        {Tabs.map((tab) => (
          <TabTitle
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => {
              if (tab.url) {
                window.open(tab.url(packageInfo.objectId, network), "_blank");
                return;
              }
              setActiveTab(tab.key);
            }}
          >
            <Text
              variant="small/regular"
              className="flex flex-shrink-0 items-center gap-XSmall"
            >
              {tab.title}
              {tab.url && <OpenInNewWindowIcon />}
            </Text>
          </TabTitle>
        ))}
      </div>
      <div className="py-Regular">
        { activeTab === 'source-code' && <PackageVersions packageInfo={packageInfo} />}
      </div>
    </div>
  );
}
