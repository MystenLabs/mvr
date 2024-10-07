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
        <Text
          variant="heading/bold"
          color="secondary"
          className="max-w-[750px]"
        >
          {packageInfo.display.name}
        </Text>
      )}

      <div className="grid grid-cols-1 gap-Regular pt-Regular md:grid-cols-12">
        <div className="py-Small pb-Large md:col-span-3">
          {packageInfo.suiDisplay?.imageUrl && (
            <img src={packageInfo.suiDisplay.imageUrl} />
          )}

          {/* {!disableEdits && (
            <Button variant="secondary" className="w-full">
              Edit NFT
            </Button>
          )} */}
        </div>
        <div className="md:col-span-9">
          <PackageInfoTabs packageInfo={packageInfo} disableEdits={disableEdits} />
        </div>
      </div>
    </div>
  );
}
