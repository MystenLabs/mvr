import { Text } from "../ui/Text";
import { Button } from "../ui/button";
import { type PackageInfoData } from "@/utils/types";
import { OpenInNewWindowIcon } from "@radix-ui/react-icons";
import { usePackagesNetwork } from "../providers/packages-provider";
import { PackageEditor } from "./PackageEditor";

export function PackageInfoViewer({
  packageInfo,
  disableEdits,
}: {
  packageInfo: PackageInfoData;
  disableEdits?: boolean;
}) {
  const network = usePackagesNetwork();
  return (
    <div>
      {!disableEdits && (
        <Text kind="heading" size="heading-large" className="max-w-[750px]">
          {packageInfo.display.name}
        </Text>
      )}

      <div className="grid grid-cols-1 gap-md pt-md md:grid-cols-12">
        <div className="md:col-span-9">
          <PackageEditor
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

          <Button
            variant="secondary"
            className="mt-sm flex w-full items-center gap-xs"
            onClick={() => {
              window.open(
                `https://suiexplorer.com/object/${packageInfo.objectId}?network=${network}`,
                "_blank",
              );
            }}
          >
            View on Explorer
            <OpenInNewWindowIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
