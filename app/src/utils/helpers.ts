import type { SuiClientTypes } from "@mysten/sui/client";
import { PackageInfo } from "@/contracts/mvr_metadata/package_info";
import { PackageInfoData } from "./types";

/**
 * Parse a PackageInfo object's BCS content (+ Display v2 output) into the shape
 * the app consumes.
 */
export const parsePackageInfoContent = (
  obj?: SuiClientTypes.Object<{ content: true; display: true }>,
): PackageInfoData => {
  if (!obj?.content) throw new Error("Invalid package info object");

  const fields = PackageInfo.parse(obj.content);
  const display = (obj.display?.output ?? {}) as Record<string, any>;

  return {
    objectId: fields.id,
    packageAddress: fields.package_address,
    upgradeCapId: fields.upgrade_cap_id,
    display: {
      gradientFrom: fields.display.gradient_from,
      gradientTo: fields.display.gradient_to,
      name: fields.display.name,
      textColor: fields.display.text_color,
    },
    gitVersionsTableId: fields.git_versioning.id,
    metadata: fields.metadata.contents.reduce(
      (acc: Record<string, string>, x) => {
        acc[x.key] = x.value;
        return acc;
      },
      {},
    ),
    suiDisplay: {
      imageUrl: display.image_url,
    },
  };
};
