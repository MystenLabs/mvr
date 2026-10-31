import { useSuiClientsContext } from "@/components/providers/client-provider";
import { MvrHeader, NoRefetching } from "@/lib/utils";
import { AppQueryKeys } from "@/utils/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { SuiGraphQLClient } from "@mysten/sui/graphql";
import { fetchAllPages } from "@/utils/query";

type ResolutionResponse = Record<string, { package_id: string } | null>;
type ResolutionVersion = { version: number; address: string };

const MAX_PER_PAGE = 5;

const VERSIONS_QUERY = `query($address: SuiAddress!, $after: String) {
  packageVersions(address: $address, first: 50, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { version address }
  }
}`;

/** Read every version so upgraded schemas and nameless packages are not truncated. */
export async function fetchPackageVersions(gql: SuiGraphQLClient, address: string): Promise<ResolutionVersion[]> {
  const versions = await fetchAllPages<ResolutionVersion>({
    asyncFn: async (after) => {
      const res = await gql.query<{
        packageVersions: {
          nodes: ResolutionVersion[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }>({ query: VERSIONS_QUERY, variables: { address, after } });
      if (res.errors?.length) {
        throw new Error(`Package versions query failed: ${res.errors[0]?.message}`);
      }
      const page = res.data?.packageVersions;
      if (!page) throw new Error("Missing package versions response");
      return { items: page.nodes, hasNextPage: page.pageInfo.hasNextPage, cursor: page.pageInfo.endCursor };
    },
  });
  return versions.sort((a, b) => b.version - a.version);
}

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
      if (name.startsWith("0x")) {
        return fetchPackageVersions(clients.graphql[network], name);
      }

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
      if (name.startsWith("0x")) return undefined;
      const lastPageVersion = lastPage[lastPage.length - 1]?.version || 1;
      return lastPageVersion - 1 > 0 ? lastPageVersion - 1 : undefined;
    },
    enabled: !!name && !!version && !!network,
    ...NoRefetching,
  });
}
