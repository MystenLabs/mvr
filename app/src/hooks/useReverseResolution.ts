import { useSuiClientsContext } from "@/components/providers/client-provider";
import { MvrHeader } from "@/lib/utils";
import { AppQueryKeys } from "@/utils/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useReverseResolution(
  address: string | string[],
  network: "mainnet" | "testnet",
) {
  const addresses = Array.isArray(address) ? address : [address];

  const queryClient = useQueryClient();
  const clients = useSuiClientsContext();

  const uncachedIds = addresses.filter(
    (addr) =>
      !queryClient.getQueryData([
        AppQueryKeys.MVR_REVERSE_RESOLUTION,
        network,
        addr,
      ]),
  );

  const { data, isLoading, error } = useQuery({
    queryKey: [AppQueryKeys.MVR_REVERSE_RESOLUTION_BULK, network, uncachedIds],
    queryFn: async () => {
      const response = await fetch(
        `${clients.mvrEndpoints[network]}/v1/reverse-resolution/bulk`,
        {
          method: "POST",
          ...MvrHeader({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            package_ids: uncachedIds,
          }),
        },
      );
      const data = await response.json();

      for (const [address, resolution] of Object.entries(data.resolution)) {
        queryClient.setQueryData(
          [AppQueryKeys.MVR_REVERSE_RESOLUTION, network, address],
          resolution,
        );
      }

      return data;
    },
    enabled: uncachedIds.length > 0,
    select: (data) => {
      return data.resolution;
    },
  });

  // Return all items: cached + newly fetched
  const allItems = addresses.reduce(
    (acc, id) => {
      const cached = queryClient.getQueryData([
        AppQueryKeys.MVR_REVERSE_RESOLUTION,
        network,
        id,
      ]);
      if (cached) acc[id] = cached;
      return acc;
    },
    {} as Record<string, any>,
  );

  return {
    items: allItems,
    isLoading,
    error,
  };
}
