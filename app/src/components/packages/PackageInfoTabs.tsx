
import { TabTitle } from "../ui/TabTitle";
import { Text } from "../ui/Text";
import { useState } from "react";
import { Network, PackageInfoData } from "@/utils/types";
import { usePackagesNetwork } from "../providers/packages-provider";
import { OpenInNewWindowIcon } from "@radix-ui/react-icons";
import { PackageVersions } from "./PackageVersions";

const Tabs = [
  {
    key: "source-code",
    title: "Source Code",
  },
  // {
  //   key: "metadata",
  //   title: "Metadata",
  // },
  {
    key: "view-on-explorer",
    title: "Explorer",
    url: (objectId: string, network: Network) =>
      `https://suiexplorer.com/object/${objectId}?network=${network}`,
  },
];

export function PackageInfoTabs({ packageInfo, disableEdits }: { packageInfo: PackageInfoData, disableEdits?: boolean }) {
  const [activeTab, setActiveTab] = useState(Tabs[0]!.key);
  const network = usePackagesNetwork();

  return (
    <div>
      <div className="flex items-center overflow-x-auto gap-md">
        {Tabs.map((tab) => (
          <TabTitle
            key={tab.key}
            disabled={activeTab !== tab.key}
            onClick={() => {
              if (tab.url) {
                window.open(tab.url(packageInfo.objectId, network), "_blank");
                return;
              }
              setActiveTab(tab.key);
            }}
          >
            <Text
              kind="paragraph"
              size="paragraph-small"
              className="flex flex-shrink-0 items-center gap-sm"
            >
              {tab.title}
              {tab.url && <OpenInNewWindowIcon />}
            </Text>
          </TabTitle>
        ))}
      </div>
      <div className="py-md">
        { activeTab === 'source-code' && <PackageVersions packageInfo={packageInfo} disableEdits={disableEdits} />}
      </div>
    </div>
  );
}
