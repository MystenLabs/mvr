import { PackageInfo } from "@/hooks/useGetPackageInfoObjects";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";
import { TabTitle } from "../ui/TabTitle";
import { Text } from "../ui/Text";
import { useState } from "react";

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
];

export function PackageInfoTabs({ packageInfo }: { packageInfo: PackageInfo }) {
  const [activeTab, setActiveTab] = useState(Tabs[0]!.key);

  return (
    <div className="p-Small">
      <div className="border-b border-border-classic">
        {Tabs.map((tab) => (
          <TabTitle
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text variant="small/regular">{tab.title}</Text>
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
