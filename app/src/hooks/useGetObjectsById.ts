import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys, Network } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";

export function useFetchObjectByIds(objectIds: string[], network: Network) {
  const clients = useSuiClientsContext();
  const client = clients[network];

  return useQuery({
    queryKey: [AppQueryKeys.LIST_OF_OBJECTS, objectIds],
    queryFn: async () => {
      if (objectIds.length === 0) return [];
      // batch in groups of 50
      const batches = objectIds.reduce(
        (acc: string[][], id: string, i: number) => {
          if (i % 50 === 0) {
            acc.push([]);
          }
          const batch = acc[acc.length - 1];
          batch && batch.push(id);
          return acc;
        },
        [[]],
      );

      const objects = await Promise.all(
        batches.map(async (batch) => {
          if (batch.length === 0) return [];
          return await client.multiGetObjects({
            ids: batch,
            options: { showContent: true, showType: true },
          });
        }),
      );

      return objects.flat();
    },
    enabled: !!objectIds.length,
  });
}
