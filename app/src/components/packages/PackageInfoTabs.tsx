import { PackageInfo } from "@/hooks/useGetPackageInfoObjects";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";
import { TabTitle } from "../ui/TabTitle";
import { Text } from "../ui/Text";
import { useState } from "react";
import { useVersionsTable } from "@/hooks/useVersionsTable";
import { Network } from "@/utils/types";
import { usePackagesNetwork } from "../providers/packages-provider";
import { OpenInNewWindowIcon } from "@radix-ui/react-icons";

const Tabs = [
  {
    key: "source-code",
    title: "Source Code",
    content: "Source Code",
  },
  {
    key: "metadata",
    title: "Metadata",
    content: "Metadata",
  },
  {
    key: "view-on-explorer",
    title: "View on Explorer",
    content: "View on Explorer",
    url: (objectId: string, network: Network) =>
      `https://suiexplorer.com/object/${objectId}?network=${network}`,
  },
];

export function PackageInfoTabs({ packageInfo }: { packageInfo: PackageInfo }) {
  const [activeTab, setActiveTab] = useState(Tabs[0]!.key);
  const network = usePackagesNetwork();

  const { data: versions } = useVersionsTable(packageInfo.gitVersionsTableId);

  console.log(versions);

  return (
    <div className="p-Small">
      <div className="border-b border-border-classic">
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
              className="flex flex-wrap items-center gap-XSmall"
            >
              {tab.title}
              {tab.url && <OpenInNewWindowIcon />}
            </Text>
          </TabTitle>
        ))}
      </div>

      <div className="py-Regular">
        {activeTab === "source-code" && (
          <div>{JSON.stringify(packageInfo)}</div>
        )}
      </div>
    </div>
  );
}
