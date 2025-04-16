import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

const NoRefetching = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

export function useGetMvrDependencies(
  packageId: string,
  network: "mainnet" | "testnet",
) {
  const clients = useSuiClientsContext();

  return useQuery({
    queryKey: [AppQueryKeys.MVR_DEPENDENCIES, network, packageId],
    queryFn: async () => {
      const endpoint = clients.mvrExperimentalEndpoints[network];

      const response = await fetch(
        `${endpoint}/v1/package-address/${packageId}/dependencies`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dependencies");
      }

      return response.json();
    },

    select: (data) => {
      return data.dependencies;
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
      const endpoint = clients.mvrExperimentalEndpoints[network];

      const response = await fetch(
        `${endpoint}/v1/package-address/${packageId}/dependents${pageParam ? `?cursor=${pageParam}` : ""}`,
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
