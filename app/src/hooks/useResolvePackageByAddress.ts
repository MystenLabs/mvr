import { useQuery } from "@tanstack/react-query";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import type { ResolvedName } from "./mvrResolution";

/** Confirms the address is a Move package and lists its versions in one query. */
const PACKAGE_QUERY = `query($address: SuiAddress!) {
  object(address: $address) { asMovePackage { address } }
  packageVersions(address: $address, first: 50) { nodes { version address } }
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
        object: { asMovePackage: { address: string } | null } | null;
        packageVersions: { nodes: { version: number; address: string }[] };
      }>({ query: PACKAGE_QUERY, variables: { address } });
      if (!res.data?.object?.asMovePackage) return null;
      const nodes = res.data.packageVersions?.nodes ?? [];
      // Prefer versions published at exactly this address (a system package keeps
      // one address across versions); fall back to the whole set.
      const here = nodes.filter(
        (n) => normalizeSuiAddress(n.address) === normalizeSuiAddress(address),
      );
      const version = (here.length ? here : nodes).reduce(
        (m, n) => Math.max(m, n.version),
        0,
      );
      return {
        name: address,
        version,
        package_address: address,
        metadata: {},
        git_info: null,
        package_info: null,
      };
    },
  });
}
