import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";

export type SearchResultItem = {
  name: string;
  metadata: Record<string, string>;
  mainnet_package_info_id: string | null;
  testnet_package_info_id: string | null;
};  

export type SearchResult = {
  data: SearchResultItem[];
  next_cursor: string | null;
  limit: number;
};

export type ResolvedName = {
  name: string;
  version: number;
  package_address: string;
  metadata: Record<string, string>;
  git_info: {
    repository_url: string;
    path: string;
    tag: string;
  } | null;
  package_info: {
    id: string;
    git_table_id: string;
    metadata: Record<string, string>;
    default_name: string | null;
  } | null;
};

/**
 * Resolve a MVR name from the API.
 * @returns
 */
export function useResolveMvrName(
  name: string,
  network: "mainnet" | "testnet",
) {
  const mvrEndpoint = useSuiClientsContext().mvrEndpoints[network];

  return useQuery({
    queryKey: [AppQueryKeys.RESOLVE_MVR_NAME, network, name],
    queryFn: async () => {
      const response = await fetch(`${mvrEndpoint}/v1/names/${name}`);

      if (!response.ok) {
        throw new Error("Failed to resolve MVR name");
      }

      return response.json() as Promise<ResolvedName>;
    },
    enabled: !!name,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}

/**
 * Search for MVR names in the API.
 * @param query - The query to search for
 * @returns The search results
 */
export function useSearchMvrNames(query: string) {
  const mvrEndpoint = useSuiClientsContext().mvrEndpoints.mainnet;

  return useQuery({
    queryKey: [AppQueryKeys.SEARCH_MVR_NAMES, query],
    queryFn: async () => {
        console.log("Querying...");
      const response = await fetch(
        `${mvrEndpoint}/v1/names?search=${query}&limit=20`,
      );

      if (!response.ok) {
        throw new Error("Failed to search MVR names");
      }

      return response.json() as Promise<SearchResult>;
    },
    enabled: !!query,
  });
}
