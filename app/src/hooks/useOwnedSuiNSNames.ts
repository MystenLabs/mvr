import { useSuiClientsContext } from "@/components/providers/client-provider";
import { MAINNET_CONFIG } from "@mysten/suins";
import { useQuery } from "@tanstack/react-query";
import { useActiveAddress } from "./useActiveAddress";
import { fetchAllOwnedObjects } from "@/utils/query";
import { SuiObjectResponse } from "@mysten/sui/client";
import { normalizeSuiNSName } from "@mysten/sui/utils";

export type SuinsName = {
  nftId: string;
  domainName: string;
  expirationTimestampMs: number;
  kiosk?: string;
  kioskCap?: string;
};

const parseName = (response: SuiObjectResponse) => {
  if (response.data?.content?.dataType !== 'moveObject') throw new Error('Invalid object type');
  const fields = response.data.content.fields as Record<string, any>;
  return {
    ...fields,
    nftId: fields.id.id,
    expirationTimestampMs: fields.expiration_timestamp_ms,
    domainName: normalizeSuiNSName(fields.domain_name, 'at'),
  };
}

// we default these to mainnet, as we don't have cross-network support
// for apps registration
// TODO: Add support for KIOSK-held names.
export function useOwnedSuinsNames() {
  const activeAddress = useActiveAddress();
  const client = useSuiClientsContext().mainnet;

  return useQuery({
    queryKey: ['ownedSuinsNames', activeAddress],
    queryFn: async () => {
      const ownedNames = await fetchAllOwnedObjects({
        client,
        address: activeAddress!,
        filter: {
          StructType: `${MAINNET_CONFIG.suinsPackageId!.v1}::suins_registration::SuinsRegistration`
        }
      });

      return ownedNames;
    },
    enabled: !!activeAddress,

    select: (data) => {
      return data.map(parseName) as SuinsName[];
    },
  })
}

export function formatNamesForComboBox(names: SuinsName[]) {
  return names.map((x) => ({
    value: x.nftId,
    label: x.domainName,
  }));
}
