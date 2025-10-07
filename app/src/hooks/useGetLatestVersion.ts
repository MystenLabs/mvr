import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys, Network } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import { graphql } from "@mysten/sui/graphql/schemas/2024.4";
import { SuiGraphQLClient } from "@mysten/sui/graphql";

const LATEST_PACKAGE_VERSION_QUERY = graphql(`
  query ($address: String!) {
    package(address: $address) {
      version
    }
}
`);

const PACKAGE_AT_VERSION_QUERY = graphql(`
  query ($address: String!, $version: Int!) {
    atVersion: package(address: $address) {
      packageAt(version: $version) {
        address
      }
    }
    original: package(address: $address) {
      packageAt(version: 1) {
        address
      }
    }
  }
`);

export const queryVersions = async (client: SuiGraphQLClient, pkg: string, version: number) => {
    const result = await client.query({
        query: PACKAGE_AT_VERSION_QUERY,
        variables: { address: pkg, version },
    });
    
    return result;
}

export function useGetPackageLatestVersion(
  packageId: string,
  network: Network,
) {
  const { graphql } = useSuiClientsContext();

  return useQuery({
    queryKey: [AppQueryKeys.PACKAGE_LATEST_VERSION, packageId],
    queryFn: async () => {
      const client = graphql[network as "mainnet" | "testnet"];
      if (!client) throw new Error("Invalid network");

      const result = await client.query({
        query: LATEST_PACKAGE_VERSION_QUERY,
        variables: { address: packageId },
      });

      return result;
    },
    select: (data): number => {
      return (data?.data?.package as Record<string, number>)?.version ?? 1;
    },
    // let's avoid hitting rate limits.
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!packageId && ["mainnet", "testnet"].includes(network),
  });
}
