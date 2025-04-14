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

export const Tabs = [
  {
    key: "readme",
    title: "Readme",
    selectedIcon: <ReadMeIconSelected />,
    unselectedIcon: <ReadMeIconUnselected />,
    component: <></>,
  },
  {
    key: "versions",
    title: "Versions",
    selectedIcon: <VersionsIconSelected />,
    unselectedIcon: <VersionsIconUnselected />,
    component: <></>,
  },
  {
    key: "dependencies",
    title: "Dependencies",
    selectedIcon: <DependenciesIconSelected />,
    unselectedIcon: <DependenciesIconUnselected />,
    component: <></>,
  },
  {
    key: "dependends",
    title: "Dependends",
    selectedIcon: <DependendsIconSelected />,
    unselectedIcon: <DependendsIconUnselected />,
    component: <></>,
  },
];

export type SinglePackageTab = (typeof Tabs)[number];

export function SinglePackageTabs({
  setActiveTab,
  isActiveTab,
  className,
}: {
  setActiveTab: (tab: string) => void;
  isActiveTab: (tab: string) => boolean;
  className?: string;
}) {
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
        </div>
      ))}
    </div>
  );
}
