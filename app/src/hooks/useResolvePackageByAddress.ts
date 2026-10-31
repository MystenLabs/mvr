import { useQuery } from "@tanstack/react-query";
import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import type { ResolvedName } from "./mvrResolution";

/** Read the package version at this address, including system package upgrades. */
const PACKAGE_QUERY = `query($address: SuiAddress!) {
  object(address: $address) { asMovePackage { address version } }
}`;

/**
 * Resolve a bare package address into a minimal `ResolvedName`, for packages with
 * no MVR name. `name` is the address itself (so `name.name` stays a string — the
 * page title just shows the address), and there is no `git_info`/`metadata`/
 * `package_info`, so only the address-keyed surfaces render. Returns `null` if the
 * address isn't a Move package on this network.
 */
export function useResolvePackageByAddress(
  address: string,
  network: "mainnet" | "testnet",
) {
  const gql = useSuiClientsContext().graphql[network];
  return useQuery({
    queryKey: [AppQueryKeys.PACKAGE_BY_ADDRESS, network, address],
    enabled: !!address && address.startsWith("0x"),
    queryFn: async (): Promise<ResolvedName | null> => {
      const res = await gql.query<{
        object: { asMovePackage: { address: string; version: number } | null } | null;
      }>({ query: PACKAGE_QUERY, variables: { address } });
      if (res.errors?.length) {
        throw new Error(`Package query failed: ${res.errors[0]?.message}`);
      }
      const pkg = res.data?.object?.asMovePackage;
      if (!pkg) return null;
      return {
        name: address,
        version: pkg.version,
        package_address: pkg.address,
        metadata: {},
        git_info: null,
        package_info: null,
      };
    },
  });
}
