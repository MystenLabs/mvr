import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import type { SuiClient } from "@mysten/sui/client";
import {
  attestationConfig,
  attestorFor,
  boxAddress,
  isEffective,
  toAttestationInfo,
  type AttestationInfo,
  type ConventionsContext,
  type TrustedAttestor,
} from "@/lib/attestations";

export interface DisplayedAttestation {
  info: AttestationInfo;
  /** The trusted attester this attestation's type belongs to. */
  attestor: TrustedAttestor;
  /** Effectiveness per the conventions (active + unexpired + requires met). */
  effective: boolean;
}

/** Resolve an attestation by id from chain (for `requires` traversal). */
function fetchByIdFor(client: SuiClient): ConventionsContext["fetchById"] {
  return async (id: string) => {
    const resp = await client.getObject({
      id,
      options: { showType: true, showDisplay: true },
    });
    const info = toAttestationInfo(resp);
    if (!info) throw new Error(`required attestation ${id} is not an Attestation<T>`);
    return info;
  };
}

/**
 * List the attestations about `subject` from the configured trusted attesters.
 *
 * Reads the per-subject Box directly over JSON-RPC (no MVR backend), keeps only
 * `Attestation<T>` whose inner-type package is in a trusted lineage and that
 * carry a registered Display, and computes each one's effectiveness. M2 filters
 * the lineage client-side; M3 will scope it server-side via `MatchAny` over the
 * exact Display-registered trusted types.
 */
export function useGetAttestations(
  subject: string | undefined,
  network: "mainnet" | "testnet",
) {
  const client = useSuiClientsContext()[network];
  const cfg = attestationConfig();

  return useQuery({
    queryKey: [AppQueryKeys.ATTESTATIONS, network, subject],
    enabled: !!subject && !!cfg,
    queryFn: async (): Promise<DisplayedAttestation[]> => {
      const owner = boxAddress(cfg!.registryId, subject!);
      const structType = `${cfg!.registryPkg}::attestation_registry::Attestation`;

      // 1. List every Attestation<*> on the box (empty type params match all
      //    instantiations server-side).
      const infos: AttestationInfo[] = [];
      let cursor: string | null | undefined = null;
      do {
        const page = await client.getOwnedObjects({
          owner,
          filter: { StructType: structType },
          options: { showType: true, showDisplay: true },
          cursor,
        });
        for (const r of page.data) {
          const info = toAttestationInfo(r);
          if (info) infos.push(info);
        }
        cursor = page.hasNextPage ? page.nextCursor : null;
      } while (cursor);

      // 2. Keep trusted attesters (inner-type package in a trusted lineage)
      //    that registered a Display (non-empty display fields).
      const trusted = infos
        .map((info) => ({ info, attestor: attestorFor(cfg!, info.innerType) }))
        .filter(
          (x): x is { info: AttestationInfo; attestor: TrustedAttestor } =>
            !!x.attestor && Object.keys(x.info.display).length > 0,
        );

      // 3. Effectiveness honours the transitive `requires` convention.
      const ctx: ConventionsContext = { fetchById: fetchByIdFor(client) };
      return Promise.all(
        trusted.map(async ({ info, attestor }) => ({
          info,
          attestor,
          effective: await isEffective(info, ctx),
        })),
      );
    },
  });
}
