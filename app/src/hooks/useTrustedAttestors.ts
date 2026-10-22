import { useQuery } from "@tanstack/react-query";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { SuiGraphQLClient } from "@mysten/sui/graphql";
import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { attestationConfig, type ResolvedAttestor } from "@/lib/attestations";
import { fetchPackageVersions } from "./useGetMvrVersionAddresses";

/** Every published version id of the package originally published at `originalId`
 *  — the attester's lineage. Always includes `originalId`, so a config entry still
 *  matches its own base package even if the lookup returns nothing. */
async function lineageOf(
  gql: SuiGraphQLClient,
  originalId: string,
): Promise<string[]> {
  const ids = (await fetchPackageVersions(gql, originalId)).map((n) => n.address);
  return [...new Set([originalId, ...ids].map((a) => normalizeSuiAddress(a)))];
}

/**
 * Resolve the network's trusted attester lineages from originalId through
 * packageVersions. Matching a schema's defining package against this lineage
 * includes types introduced in upgrades without hand-listing version IDs.
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
