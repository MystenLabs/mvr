import { useSuiClientsContext } from "@/components/providers/client-provider";
import { useQuery } from "@tanstack/react-query";
import { useActiveAddress } from "./useActiveAddress";
import { SuiClient, SuiObjectResponse } from "@mysten/sui/client";
import { Network } from "@/utils/types";
import { fetchAllOwnedObjects } from "@/utils/query";

export type UpgradeCap = {
  objectId: string;
  package: string;
  version: string;
  policy: string;
};

/// Fetches all upgrade caps owned by the given address
const getUpgradeCaps = async (client: SuiClient, address: string) => {
  return fetchAllOwnedObjects({
    client,
    address,
    filter: {
      StructType: "0x2::package::UpgradeCap",
    },
  });
};

const parseUpgradeCapContent = (cap?: SuiObjectResponse): UpgradeCap => {
  if (!cap) throw new Error("Invalid upgrade cap object");
  if (!cap.data) throw new Error("Invalid upgrade cap object");
  if (!cap.data.content) throw new Error("Invalid upgrade cap object");
  if (cap.data.content.dataType !== "moveObject")
    throw new Error("Invalid upgrade cap object");

  const fields = cap.data.content.fields as Record<string, any>;

  return {
    objectId: fields.id.id,
    package: fields.package,
    version: fields.version,
    policy: fields.policy,
  };
};

export function useGetUpgradeCaps(network: Network) {
  const address = useActiveAddress();
  const clients = useSuiClientsContext();

  return useQuery({
    queryKey: ["getUpgradeCaps", address, network],
    queryFn: async () => {
      return await getUpgradeCaps(clients[network], address!);
    },
    enabled: !!address,
    refetchOnMount: false,
    refetchOnReconnect: false,
    select(data) {
      return data.map(parseUpgradeCapContent) ?? [];
    },
  });
}
