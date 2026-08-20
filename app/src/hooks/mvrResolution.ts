import { useSuiClientsContext } from "@/components/providers/client-provider";
import { MvrHeader } from "@/lib/utils";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import { useResolvePackageByAddress } from "./useResolvePackageByAddress";

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

/** Whether this is a nameless (unregistered) package — one resolved by bare
 *  address, where `name.name` holds the address rather than an `@org/app` MVR
 *  name. Such packages have no `git_info`/`package_info`, so only on-chain
 *  surfaces (versions, dependencies, dependents, attestations) render. */
export function isUnregisteredPackage(name: ResolvedName): boolean {
  return name.name.startsWith("0x");
}

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
      const response = await fetch(
        `${mvrEndpoint}/v1/names/${name}`,
        MvrHeader(),
      );

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
 * Resolve a URL segment that is either an MVR name (`@org/app`) or a bare package
 * address (`0x…`) into a `ResolvedName`. A name goes through the MVR resolver; an
 * address has no name and is resolved on-chain by `useResolvePackageByAddress`
 * (yielding a nameless `ResolvedName`). One of the two underlying queries is
 * disabled each render, keyed on whether `input` looks like an address.
 */
export function useResolvePackage(
  input: string,
  network: "mainnet" | "testnet",
) {
  const isAddress = !!input && input.startsWith("0x");
  const byName = useResolveMvrName(isAddress ? "" : input, network);
  const byAddress = useResolvePackageByAddress(isAddress ? input : "", network);
  return isAddress ? byAddress : byName;
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
      const response = await fetch(
        `${mvrEndpoint}/v1/names?search=${query}&limit=20&is_linked=true`,
        MvrHeader(),
      );

      if (!response.ok) {
        throw new Error("Failed to search MVR names");
      }

      return response.json() as Promise<SearchResult>;
    },
    enabled: !!query,
  });
}
