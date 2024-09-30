import { useSuiClientsContext } from "@/components/providers/client-provider";
import { MAINNET_CONFIG } from "@mysten/suins";
import { useQuery } from "@tanstack/react-query";
import { useActiveAddress } from "./useActiveAddress";
import { fetchAllOwnedObjects } from "@/utils/query";
import { SuiObjectResponse } from "@mysten/sui/client";
import { normalizeSuiNSName } from "@mysten/sui/utils";
import { AppQueryKeys } from "@/utils/types";
import { useKioskItems } from "./useKioskItems";
import { useFetchObjectByIds } from "./useGetObjectsById";
import { KioskOwnerCap } from "@mysten/kiosk";

const NS_MAINNET_TYPE = `${MAINNET_CONFIG.suinsPackageId!.v1}::suins_registration::SuinsRegistration`;

export type SuinsName = {
  nftId: string;
  domainName: string;
  expirationTimestampMs: number;
  kioskCap?: KioskOwnerCap;
  objectType?: string;
};

const parseName = (response: SuiObjectResponse) => {
  if (response.data?.content?.dataType !== "moveObject")
    throw new Error("Invalid object type");
  const fields = response.data.content.fields as Record<string, any>;
  return {
    ...fields,
    nftId: fields.id.id,
    expirationTimestampMs: fields.expiration_timestamp_ms,
    domainName: normalizeSuiNSName(fields.domain_name, "at"),
  };
};

// we default these to mainnet, as we don't have cross-network support
// for apps registration
// TODO: Add support for KIOSK-held names.
export function useOwnedSuinsNames() {
  const activeAddress = useActiveAddress();
  const client = useSuiClientsContext().mainnet;

  return useQuery({
    queryKey: [AppQueryKeys.OWNED_SUINS_NAMES, activeAddress],
    queryFn: async () => {
      const ownedNames = await fetchAllOwnedObjects({
        client,
        address: activeAddress!,
        filter: {
          StructType: NS_MAINNET_TYPE,
        },
      });

      return ownedNames;
    },
    enabled: !!activeAddress,

    select: (data) => {
      return data.map(parseName) as SuinsName[];
    },
  });
}

/** Returns */
export function useOwnedAndKioskSuinsNames() {
  const { data: kioskItems, isLoading: kioskItemsLoading } = useKioskItems();
  const { data: suinsNames, isLoading: ownedNamesLoading } =
    useOwnedSuinsNames();

  const ids = kioskItems?.filter((x) => x.type === NS_MAINNET_TYPE) ?? [];

  const { data: kioskSuinsObjects } = useFetchObjectByIds(
    ids.map((x) => x.objectId),
    "mainnet",
  );

  const parsed =
    kioskSuinsObjects?.map(parseName).map((nsName) => {
      const name = { ...nsName } as SuinsName;

      name.kioskCap = kioskItems?.find(
        (x) => x.objectId === nsName.nftId,
      )?.kioskCap;
      name.objectType = NS_MAINNET_TYPE;

      return name;
    }) ?? [];

  return {
    isLoading: ownedNamesLoading || kioskItemsLoading,
    names: [...(suinsNames ?? []), ...parsed],
  };
}

export function formatNamesForComboBox(names: SuinsName[]) {
  return names.map((x) => ({
    value: x.nftId,
    label: x.domainName,
  }));
}
