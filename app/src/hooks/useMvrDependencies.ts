import { useSuiClientsContext } from "@/components/providers/client-provider";
import { NoRefetching } from "@/lib/utils";
import { AppQueryKeys } from "@/utils/types";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export function useGetMvrDependencies(
  packageId: string,
  network: "mainnet" | "testnet",
) {
  const clients = useSuiClientsContext();

  return useQuery({
    queryKey: [AppQueryKeys.MVR_DEPENDENCIES, network, packageId],
    queryFn: async () => {
      const endpoint = clients.mvrEndpoints[network];

      const response = await fetch(
        `${endpoint}/v1/package-address/${packageId}/dependencies`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dependencies");
      }

      return response.json();
    },

    select: (data) => {
      return data.dependencies as string[];
    },
    ...NoRefetching,
  });
}

export type MvrDependent = {
  package_id: string;
  aggregated_total_calls: number;
  aggregated_direct_calls: number;
  aggregated_propagated_calls: number;
};

// Returns a paginated list of dependents for a given package address
export function useGetMvrDependents(
  packageId: string,
  network: "mainnet" | "testnet",
) {
  const clients = useSuiClientsContext();

  return useInfiniteQuery({
    queryKey: [AppQueryKeys.MVR_DEPENDENTS, network, packageId],
    queryFn: async ({ pageParam }) => {
      const endpoint = clients.mvrEndpoints[network];

      const response = await fetch(
        `${endpoint}/v1/package-address/${packageId}/dependents?limit=50${pageParam ? `&cursor=${pageParam}` : ""}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dependents");
      }

      return response.json();
    },
    getNextPageParam: (lastPage) => {
      return lastPage.next_cursor;
    },
    select: (data) => {
      return {
        packages: data.pages.flatMap((page) => page.data) as MvrDependent[],
        hasMore: !!data.pages[data.pages.length - 1].next_cursor,
      };
    },
    initialPageParam: undefined,
    ...NoRefetching,
  });
}
