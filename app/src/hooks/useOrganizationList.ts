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
import { useOwnedApps } from "./useOwnedApps";
import { ReactNode } from "react";

const NS_MAINNET_TYPE = `${MAINNET_CONFIG.suinsPackageId!.v1}::suins_registration::SuinsRegistration`;
const NS_SUBNAME_MAINNET_TYPE = `0x00c2f85e07181b90c140b15c5ce27d863f93c4d9159d2a4e7bdaeb40e286d6f5::subdomain_registration::SubDomainRegistration`;

export type SuinsName = {
  nftId: string;
  domainName: string;
  expirationTimestampMs: number;
  kioskCap?: KioskOwnerCap;
  objectType?: string;
  isSubname?: boolean;
  // if true, this name is a capability only, meaning we cannot create
  // any other apps under it.
  isCapabilityOnly?: boolean;
  isPublicGood?: boolean;
};

// A list of known public good names.
const PUBLIC_NAMES: SuinsName[] = [
  {
    nftId: '0xToReplace', // replace this with the `public good` object id.
    domainName: '@pkg',
    expirationTimestampMs: 0,
    isCapabilityOnly: false,
    isPublicGood: true,
  }
]

const parse = (response: SuiObjectResponse) => {
  if (response.data?.content?.dataType !== "moveObject")
    throw new Error("Invalid object type");

  const objectFields = response.data.content.fields as Record<string, any>;
  const isSubname = response.data.type === NS_SUBNAME_MAINNET_TYPE;
  const nftFields = isSubname ? objectFields.nft.fields : objectFields;

  return {
    ...nftFields,
    nftId: objectFields.id.id,
    domainName: normalizeSuiNSName(nftFields.domain_name, "at"),
    expirationTimestampMs: nftFields.expiration_timestamp_ms,
    isSubname,
    objectType: response.data.type,
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
      return data.map(parse) as SuinsName[];
    },
  });
}

export function useOwnedSuinsSubnames() {
  const activeAddress = useActiveAddress();
  const client = useSuiClientsContext().mainnet;

  return useQuery({
    queryKey: [AppQueryKeys.OWNED_SUINS_SUBNAMES, activeAddress],
    queryFn: async () => {
      const ownedSubnames = await fetchAllOwnedObjects({
        client,
        address: activeAddress!,
        filter: {
          StructType: NS_SUBNAME_MAINNET_TYPE,
        },
      });

      return ownedSubnames;
    },

    select: (data) => {
      return data.map(parse) as SuinsName[];
    },
  });
}

/** Returns */
export function useOrganizationList() {
  const { data: kioskItems, isLoading: kioskItemsLoading } = useKioskItems();
  const { data: suinsNames, isLoading: ownedNamesLoading } =
    useOwnedSuinsNames();

  const { data: suinsSubnames, isLoading: suinsSubnamesLoading } =
    useOwnedSuinsSubnames();

  // make all the "apps" available in the orgs section, even if we do not own
  // the SuiNS name. We can only manage the individual apps.
  const { data: apps } = useOwnedApps();

  const ids =
    kioskItems?.filter(
      (x) => x.type === NS_MAINNET_TYPE || x.type === NS_SUBNAME_MAINNET_TYPE,
    ) ?? [];

  const { data: kioskSuinsObjects } = useFetchObjectByIds(
    ids.map((x) => x.objectId),
    "mainnet",
  );

  const parsed =
    kioskSuinsObjects?.map(parse).map((nsName) => {
      const name = { ...nsName } as SuinsName;

      name.kioskCap = kioskItems?.find(
        (x) => x.objectId === nsName.nftId,
      )?.kioskCap;
      name.objectType = nsName.objectType;

      return name;
    }) ?? [];

  const names = [...PUBLIC_NAMES, ...(suinsNames ?? []), ...parsed, ...(suinsSubnames ?? [])];

  for (const app of apps ?? []) {
    // skip if we already have a name for this app.
    if (names.find((x) => x.domainName === app.orgName)) continue;

    names.push({
      nftId: app.objectId,
      domainName: app.orgName,
      expirationTimestampMs: 0,
      isCapabilityOnly: true,
    });
  }

  return {
    isLoading:
      names.length === 0 &&
      (ownedNamesLoading || kioskItemsLoading || suinsSubnamesLoading),
    names,
  };
}

export function formatNamesForComboBox(names: SuinsName[], publicGoodLabel: ReactNode) {
  return names.map((x) => ({
    value: x.nftId,
    label: x.domainName,
    children: x.isPublicGood ? publicGoodLabel : null,
  }));
}
