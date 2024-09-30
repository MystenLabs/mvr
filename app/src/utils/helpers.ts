import { SuiObjectResponse } from "@mysten/sui/client";
import { PackageInfoData } from "./types";


export const parsePackageInfoContent = (cap?: SuiObjectResponse): PackageInfoData => {
    if (!cap) throw new Error("Invalid upgrade cap object");
    if (!cap.data) throw new Error("Invalid upgrade cap object");
    if (!cap.data.content) throw new Error("Invalid upgrade cap object");
    if (cap.data.content.dataType !== "moveObject")
      throw new Error("Invalid upgrade cap object");
  
    const display = cap.data.display?.data as Record<string, any>;
    const fields = cap.data.content.fields as Record<string, any>;
  
    return {
      objectId: fields.id.id,
      packageAddress: fields.package_address,
      upgradeCapId: fields.upgrade_cap_id,
      display: {
        gradientFrom: fields.display.fields.gradient_from,
        gradientTo: fields.display.fields.gradient_to,
        name: fields.display.fields.name,
        textColor: fields.display.fields.text_color,
      },
      gitVersionsTableId: fields.git_versioning.fields.id.id,
      metadata: fields.metadata,
      suiDisplay: {
        imageUrl: display.image_url,
      }
    };
  };
