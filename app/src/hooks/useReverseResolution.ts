import { useSuiClientsContext } from "@/components/providers/client-provider";
import { MvrHeader } from "@/lib/utils";
import { AppQueryKeys } from "@/utils/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const MAX_BULK_REVERSE_RESOLUTION = 50;

type ReverseResolution = { name: string | null };

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function useReverseResolution(
  address: string | string[],
  network: "mainnet" | "testnet",
) {
  const addresses = Array.isArray(address) ? address : [address];

  const queryClient = useQueryClient();
  const clients = useSuiClientsContext();

  const uncachedIds = [
    ...new Set(
      addresses.filter(
        (addr) =>
          !queryClient.getQueryData([
            AppQueryKeys.MVR_REVERSE_RESOLUTION,
            network,
            addr,
          ]),
      ),
    ),
  ];

  const { isLoading, error } = useQuery({
    queryKey: [AppQueryKeys.MVR_REVERSE_RESOLUTION_BULK, network, uncachedIds],
    queryFn: async () => {
      const responses = await Promise.all(
        chunk(uncachedIds, MAX_BULK_REVERSE_RESOLUTION).map(async (ids) => {
          const response = await fetch(
            `${clients.mvrEndpoints[network]}/v1/reverse-resolution/bulk`,
            {
              method: "POST",
              ...MvrHeader({ "Content-Type": "application/json" }),
              body: JSON.stringify({ package_ids: ids }),
            },
          );

          if (!response.ok) {
            throw new Error("Failed to reverse resolve package ids");
          }

          const data = await response.json();
          return data.resolution as Record<string, ReverseResolution>;
        }),
      );

      const resolution: Record<string, ReverseResolution> = Object.assign(
        {},
        ...responses,
      );

      for (const id of uncachedIds) {
        queryClient.setQueryData(
          [AppQueryKeys.MVR_REVERSE_RESOLUTION, network, id],
          resolution[id] ?? { name: null },
        );
      }

      return resolution;
    },
    enabled: uncachedIds.length > 0,
  });

  const allItems = addresses.reduce(
    (acc, id) => {
      const cached = queryClient.getQueryData<ReverseResolution>([
        AppQueryKeys.MVR_REVERSE_RESOLUTION,
        network,
        id,
      ]);
      if (cached?.name) acc[id] = { name: cached.name };
      return acc;
    },
    {} as Record<string, { name: string }>,
  );

  return {
    items: allItems,
    isLoading,
    error,
  };
}
