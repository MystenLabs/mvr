import { useQuery } from "@tanstack/react-query";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { SuiGraphQLClient } from "@mysten/sui/graphql";
import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { attestationConfig, type ResolvedAttestor } from "@/lib/attestations";

/** A package's version ids. One page (50) is plenty — no attester has that many
 *  upgrades — so pagination is skipped. */
const VERSIONS_QUERY = `query($address: SuiAddress!) {
  packageVersions(address: $address, first: 50) { nodes { address } }
}`;

/** Every published version id of the package originally published at `originalId`
 *  — the attester's lineage. Always includes `originalId`, so a config entry still
 *  matches its own base package even if the lookup returns nothing. */
async function lineageOf(
  gql: SuiGraphQLClient,
  originalId: string,
): Promise<string[]> {
  const res = await gql.query<{
    packageVersions: { nodes: { address: string }[] };
  }>({ query: VERSIONS_QUERY, variables: { address: originalId } });
  if (res.errors?.length) {
    throw new Error(`packageVersions failed: ${res.errors[0]?.message}`);
  }
  const ids = (res.data?.packageVersions?.nodes ?? []).map((n) => n.address);
  return [...new Set([originalId, ...ids].map((a) => normalizeSuiAddress(a)))];
}

/**
 * The network's trusted attesters with their lineages resolved from `originalId`
 * via `packageVersions`. This is the off-chain form of the on-chain original-id
 * trust rule (`attester_of<T>() = type_name::original_id<T>()`): the config carries
 * only `originalId`, and every version — including types introduced in later
 * upgrades — is derived here rather than hand-listed.
 *
 * Returns `[]` while resolving (and when the network has no config), so callers
 * that gate on it (the Issued tab) show nothing until it's ready.
 */
export function useTrustedAttestors(network: "mainnet" | "testnet") {
  const gql = useSuiClientsContext().graphql[network];
  const attestors = attestationConfig(network)?.trustedAttestors ?? [];

  const { data, isLoading } = useQuery({
    queryKey: [
      AppQueryKeys.TRUSTED_ATTESTORS,
      network,
      attestors.map((a) => a.originalId),
    ],
    enabled: attestors.length > 0,
    staleTime: Infinity,
    queryFn: (): Promise<ResolvedAttestor[]> =>
      Promise.all(
        attestors.map(async (a) => ({
          ...a,
          lineage: await lineageOf(gql, a.originalId),
        })),
      ),
  });

  return { attestors: data ?? [], isLoading };
}
