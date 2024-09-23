import { type PackageInfo } from "@/hooks/useGetPackageInfoObjects";
import { Text } from "../ui/Text";
import { PackageInfoDisplay } from "@/icons/PackageInfoDisplay";
import { Button } from "../ui/button";
import { PackageInfoTabs } from "./PackageInfoTabs";

export function PackageInfoViewer({
  packageInfo,
  disableEdits,
}: {
  packageInfo: PackageInfo;
  disableEdits?: boolean;
}) {
  return (
    <div>
      <Text
        variant="heading/bold"
        color="secondary"
        className="max-w-[750px]"
      >
        {packageInfo.display.name}
      </Text>
      <div className="grid grid-cols-1 gap-Regular pt-Regular md:grid-cols-12">
        <div className="pb-Large md:col-span-3">
          <PackageInfoDisplay
            width="100%"
            height="auto"
            className="max-lg:max-w-[300px]"
            packageAddr={packageInfo.packageAddress}
            {...packageInfo.display}
          />

          {!disableEdits && (
            <Button variant="secondary" className="w-full">
              Edit NFT
            </Button>
          )}
        </div>
        <div className="md:col-span-9">
          <PackageInfoTabs packageInfo={packageInfo} />
        </div>
      </div>
    </div>
  );
}
