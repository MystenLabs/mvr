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

export function useGetUpgradeCaps(network?: Network | "all") {
  const address = useActiveAddress();
  const clients = useSuiClientsContext();

  return useQuery({
    queryKey: ["getUpgradeCaps", address, network],
    queryFn: async () => {
      // if no network is supplied, we want to lookup all networks
      if (network === "all") {
        const [mainnet, testnet, devnet, localnet] = await Promise.all(
          [
            getUpgradeCaps(clients.mainnet, address!),
            getUpgradeCaps(clients.testnet, address!),
            getUpgradeCaps(clients.devnet, address!),
            getUpgradeCaps(clients.localnet, address!),
          ].map((p) => p.catch(() => undefined)),
        );

        return {
          mainnet,
          testnet,
          devnet,
          localnet,
        };
      } else {
        return {
          [network as Network]:
            (await getUpgradeCaps(clients[network as Network], address!)) ?? [],
        };
      }
    },
    enabled: !!address,
    refetchOnMount: false,
    refetchOnReconnect: false,
    select(data) {
      const res: Record<string, UpgradeCap[]> = {};

      for (const key of Object.keys(data)) {
        if (!data[key as Network]) continue;
        res[key] =
          data[key as Network]?.map((x) => parseUpgradeCapContent(x)) ?? [];
      }

      return {
        mainnet: res.mainnet ?? [],
        testnet: res.testnet ?? [],
        devnet: res.devnet ?? [],
        localnet: res.localnet ?? [],
      };
    },
  });
}
