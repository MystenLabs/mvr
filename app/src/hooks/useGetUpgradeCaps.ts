import { useSuiClientsContext } from "@/components/providers/client-provider";
import { useQuery } from "@tanstack/react-query";
import { useActiveAddress } from "./useActiveAddress";
import type { SuiClientTypes } from "@mysten/sui/client";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import { AppQueryKeys, Network } from "@/utils/types";
import { fetchAllOwnedObjects } from "@/utils/query";
import { UpgradeCap as UpgradeCapStruct } from "@/contracts/sui/package";

export type UpgradeCap = {
  objectId: string;
  package: string;
  version: string;
  policy: string;
};

/// Fetches all upgrade caps owned by the given address
const getUpgradeCaps = async (client: SuiGrpcClient, address: string) => {
  return fetchAllOwnedObjects({
    client,
    address,
    type: UpgradeCapStruct.typeTag(),
  });
};

const parseUpgradeCapContent = (
  obj?: SuiClientTypes.Object<{ content: true }>,
): UpgradeCap => {
  if (!obj?.content) throw new Error("Invalid upgrade cap object");

  const fields = UpgradeCapStruct.parse(obj.content);

  return {
    objectId: fields.id,
    package: fields.package,
    version: fields.version,
    policy: String(fields.policy),
  };
};

export function useGetUpgradeCaps(network: Network) {
  const address = useActiveAddress();
  const clients = useSuiClientsContext();

  return useQuery({
    queryKey: [AppQueryKeys.OWNED_UPGRADE_CAPS, address, network],
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
