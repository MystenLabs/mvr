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
      // The core client batches/dedups these getObject calls under the hood,
      // so no manual chunking is needed.
      const results = await Promise.all(
        objectIds.map((objectId) =>
          client.core.getObject({ objectId, include: { json: true } }),
        ),
      );

      return results.map((r) => r.object);
    },
    enabled: !!objectIds.length,
  });
}
