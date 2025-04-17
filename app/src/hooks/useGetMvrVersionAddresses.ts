import { useSuiClientsContext } from "@/components/providers/client-provider";
import { NoRefetching } from "@/lib/utils";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";

// TODO: Make this infinite query instead (to support more than 10 versions in the FE).
export function useGetMvrVersionAddresses(
  name: string,
  version: number,
  network: "mainnet" | "testnet",
) {
  const clients = useSuiClientsContext();

  return useQuery({
    queryKey: [AppQueryKeys.MVR_VERSION_ADDRESSES, name, network],
    queryFn: async () => {
      const versionsToQuery = Array.from(
        { length: 10 },
        (_, i) => version - i,
      ).filter((v) => v > 0);

      const mvrEndpoint = clients.mvrEndpoints[network];

      const response = await fetch(`${mvrEndpoint}/v1/resolution/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          names: versionsToQuery.map((v) => `${name}/${v}`),
        }),
      });
      return response.json();
    },
    select: (data) => {
      const resolution = data.resolution as Record<
        string,
        { package_id: string } | undefined
      >;

      const versions: { version: number; address: string }[] = [];

      for (const [name, address] of Object.entries(resolution)) {
        const version = name.split("/").pop();
        if (!version) continue;

        if (!address?.package_id) continue;

        versions.push({
          version: parseInt(version),
          address: address.package_id,
        });
      }

      versions.sort((a, b) => b.version - a.version);

      return versions;
    },
    enabled: !!name && !!version && !!network,
    ...NoRefetching,
  });
}
