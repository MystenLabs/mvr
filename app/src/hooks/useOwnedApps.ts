import { useSuiClientsContext } from "@/components/providers/client-provider";
import { useQuery } from "@tanstack/react-query";
import { useActiveAddress } from "./useActiveAddress";
import { fetchAllOwnedObjects } from "@/utils/query";
import { type DynamicFieldName, SuiObjectResponse } from "@mysten/sui/client";
import { normalizeSuiNSName } from "@mysten/sui/utils";
import { Constants } from "@/lib/constants";
import { AppQueryKeys } from "@/utils/types";

export type AppCap = {
  objectId: string;
  isImmutable: boolean;
  orgName: string;
  appName: string;
  normalizedName: string;
  dfName: DynamicFieldName;
};

const parseName = (response: SuiObjectResponse) => {
  if (response.data?.content?.dataType !== "moveObject")
    throw new Error("Invalid object type");

  const fields = response.data.content.fields as Record<string, any>;

  const data = {
    objectId: fields.id.id,
    isImmutable: fields.is_immutable,
    orgName: normalizeSuiNSName(
      [...fields.name.fields.org.fields.labels].reverse().join("."),
      "at",
    ),
    appName: fields.name.fields.app[0],
  };

  return {
    ...data,
    normalizedName: `${data.orgName}/${data.appName}`,
    dfName: {
      type: `${Constants.appsPackageId}::name::Name`,
      value: {
        org: {
          labels: fields.name.fields.org.fields.labels,
        },
        app: fields.name.fields.app,
      },
    },
  };
};

// we default these to mainnet, as we don't have cross-network support
// for apps registration
export function useOwnedApps() {
  const activeAddress = useActiveAddress();
  const client = useSuiClientsContext().mainnet;

  return useQuery({
    queryKey: [AppQueryKeys.OWNED_APPS, activeAddress],
    queryFn: async () => {
      const ownedNames = await fetchAllOwnedObjects({
        client,
        address: activeAddress!,
        filter: {
          StructType: `${Constants.appsPackageId}::app_record::AppCap`,
        },
      });

      return ownedNames;
    },
    enabled: !!activeAddress,

    select: (data) => {
      return data.map(parseName) as AppCap[];
    },
  });
}
