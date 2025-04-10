import { Text } from "../ui/Text";
import { PackageInfoDisplay } from "@/icons/PackageInfoDisplay";
import { Button } from "../ui/button";
import { PackageInfoTabs } from "./PackageInfoTabs";
import { type PackageInfoData } from "@/utils/types";

export function PackageInfoViewer({
  packageInfo,
  disableEdits,
}: {
  packageInfo: PackageInfoData;
  disableEdits?: boolean;
}) {
  return (
    <div>
      {!disableEdits && (
        <Text kind="heading" size="heading-large" className="max-w-[750px]">
          {packageInfo.display.name}
        </Text>
      )}

      <div className="gap-md pt-md grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-9">
          <PackageInfoTabs
            packageInfo={packageInfo}
            disableEdits={disableEdits}
          />
        </div>
        <div className="py-sm pb-lg md:col-span-3">
          {packageInfo.suiDisplay?.imageUrl && (
            <img
              src={packageInfo.suiDisplay.imageUrl}
              className="mx-auto max-md:max-w-[80%]"
            />
          )}

          {/* {!disableEdits && (
            <Button variant="secondary" className="w-full">
              Edit NFT
            </Button>
          )} */}
        </div>
      </div>
    </div>
  );
}
