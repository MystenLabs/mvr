import { useSuiClientsContext } from "@/components/providers/client-provider";
import { MvrHeader, NoRefetching } from "@/lib/utils";
import { AppQueryKeys } from "@/utils/types";
import { useInfiniteQuery } from "@tanstack/react-query";

type ResolutionResponse = Record<string, { package_id: string } | null>;
type ResolutionVersion = { version: number; address: string };

const MAX_PER_PAGE = 5;

export function useGetMvrVersionAddresses(
  name: string,
  version: number,
  network: "mainnet" | "testnet",
) {
  const clients = useSuiClientsContext();

  return useInfiniteQuery({
    queryKey: [AppQueryKeys.MVR_VERSION_ADDRESSES, name, network],
    initialPageParam: version,
    queryFn: async ({ pageParam }): Promise<ResolutionVersion[]> => {
      const versionsToQuery = Array.from(
        { length: MAX_PER_PAGE },
        (_, i) => pageParam - i,
      ).filter((v) => v > 0);

      const mvrEndpoint = clients.mvrEndpoints[network];

      const response = await fetch(`${mvrEndpoint}/v1/resolution/bulk`, {
        method: "POST",
        ...MvrHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          names: versionsToQuery.map((v) => `${name}/${v}`),
        }),
      });

      const jsonRes = await response.json();

      const resolution = jsonRes.resolution as ResolutionResponse;

      const versions: ResolutionVersion[] = [];

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
    select: (data) => {
      return data.pages.flat();
    },
    getNextPageParam: (lastPage) => {
      const lastPageVersion = lastPage[lastPage.length - 1]?.version || 1;
      return lastPageVersion - 1 > 0 ? lastPageVersion - 1 : undefined;
    },
    enabled: !!name && !!version && !!network,
    ...NoRefetching,
  });
}
