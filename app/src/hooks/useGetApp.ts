import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import { AppCap } from "./useOwnedApps";
import { useSuiClientsContext } from "@/components/providers/client-provider";
import { Constants } from "@/lib/constants";
import { SuiObjectResponse } from "@mysten/sui/client";
import { STATIC_CHAIN_IDENTIFIERS } from "./useChainIdentifier";

export type AppInfo = {
  packageAddress: string;
  upgradeCapId: string;
  packageInfoId: string;
};

const parseAppInfo = (field: any): AppInfo => {
  return {
    packageAddress: field.package_address,
    upgradeCapId: field.upgrade_cap_id,
    packageInfoId: field.package_info_id,
  };
};

const format = (response: SuiObjectResponse) => {
  if (response.data?.content?.dataType !== "moveObject")
    throw new Error("Invalid object type");

  const fields = response.data.content.fields as Record<string, any>;
  const data = fields.value.fields;
  const mainnetData = data.app_info?.fields
    ? parseAppInfo(data.app_info.fields)
    : null;
  // All the network data are mapped here.
  const networks = data.networks.fields.contents?.map((x: any) => ({
    key: x.fields.key,
    value: parseAppInfo(x.fields.value.fields),
  })) as { key: string; value: AppInfo }[];

  const testnet = networks.find(
    (x) => x.key === STATIC_CHAIN_IDENTIFIERS.testnet,
  )?.value;

  return {
    objectId: fields.id.id,
    mainnet: mainnetData,
    testnet,
    appCapId: data.app_cap_id,
    metadata: data.metadata.fields.contents,
    nsNftId: data.ns_nft_id,
    app_info: data.app_info,
  };
};

export function useGetAppFromCap(cap: AppCap) {
  const client = useSuiClientsContext().mainnet;

  return useQuery({
    queryKey: [AppQueryKeys.APP, cap.appName],
    queryFn: async () => {
      const data = await client.getDynamicFieldObject({
        parentId: Constants.appsRegistryTableId,
        name: cap.dfName,
      });

      console.log(data);

      return data;
    },
    select: (data) => {
      return format(data);
    },
  });
}
