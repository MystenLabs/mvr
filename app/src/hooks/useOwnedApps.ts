import { useSuiClientsContext } from "@/components/providers/client-provider";
import { useQuery } from "@tanstack/react-query";
import { useActiveAddress } from "./useActiveAddress";
import { fetchAllOwnedObjects } from "@/utils/query";
import type { SuiClientTypes } from "@mysten/sui/client";
import { normalizeSuiNSName } from "@mysten/sui/utils";
import { AppQueryKeys } from "@/utils/types";
import { AppCap as AppCapStruct } from "@/contracts/mvr_core/app_record";
import { Name } from "@/contracts/mvr_core/name";

export type AppCap = {
  objectId: string;
  isImmutable: boolean;
  orgName: string;
  appName: string;
  normalizedName: string;
  dfName: SuiClientTypes.DynamicFieldName;
};

const parseName = (obj: SuiClientTypes.Object<{ content: true }>): AppCap => {
  const parsed = AppCapStruct.parse(obj.content);

  const data = {
    objectId: parsed.id,
    isImmutable: parsed.is_immutable,
    orgName: normalizeSuiNSName(
      [...parsed.name.org.labels].reverse().join("."),
      "at",
    ),
    appName: parsed.name.app[0] ?? "",
  };

  return {
    ...data,
    normalizedName: `${data.orgName}/${data.appName}`,
    // The registry is keyed by the `Name` struct; the dynamic-field name is now
    // BCS-encoded, so serialize the parsed Name with the generated type.
    dfName: {
      type: Name.typeTag(),
      bcs: Name.serialize(parsed.name).toBytes(),
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
        // MVR name (network-agnostic) — the client resolves it per-network.
        type: "@mvr/core::app_record::AppCap",
      });

      return ownedNames;
    },
    enabled: !!activeAddress,

    select: (data) => {
      return data.map(parseName);
    },
  });
}
