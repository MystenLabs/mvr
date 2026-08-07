import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import type { SuiGraphQLClient } from "@mysten/sui/graphql";
import {
  attestationConfig,
  boxAddress,
  type TrustedAttestor,
} from "@/lib/attestations";
import { enumerateAttestationTypes } from "./useGetAttestations";
import { useTrustedAttestors } from "./useTrustedAttestors";

/** A source-verification attestation about a subject: the trusted verifier's
 *  claim that a specific source builds to the subject's bytecode. Fields come
 *  from the attestation's Move struct (`data.git_sha`, `data.git_url`, …), read
 *  as the object's JSON contents — the verifier keeps these off Display, so a
 *  consumer that wants them structured reads them from the struct directly. */
export interface SourceVerification {
  /** The attestation object id. */
  id: string;
  /** The trusted verifier that issued it (from config). */
  verifier: TrustedAttestor;
  /** Repository the source was taken from, e.g. `https://…/x.git`. */
  gitUrl: string;
  /** Subdirectory within the repo that holds the package. */
  subdir: string;
  /** The exact commit the bytecode was reproduced from. */
  gitSha: string;
  /** Hash of the source tree, if the schema records one. */
  sourceHash?: string;
  /** Toolchain the rebuild used, e.g. `1.72.2`. */
  toolchainVersion?: string;
}

interface RawData {
  git_url?: unknown;
  subdir?: unknown;
  git_sha?: unknown;
  source_hash?: unknown;
  toolchain_version?: unknown;
}

/** One GraphQL page of `Attestation<T>` objects with their Move struct contents (JSON). */
const BOX_TYPE_QUERY = `query($type: String!, $owner: SuiAddress!, $after: String) {
  objects(filter: { type: $type, owner: $owner }, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { address asMoveObject { contents { json } } }
  }
}`;

const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

/**
 * The source-verification attestations about `subject`: the live ones (in the
 * subject's active box) issued by a trusted attester whose config `role` is
 * `"source-verification"`. Reads the attestation's typed struct fields via
 * GraphQL — a read scoped to a known schema, so parsing `git_sha`/`git_url`
 * directly is intended, unlike the generic Display-only endorsement read.
 *
 * Returns `[]` (never resolving to attestations) when no verifier is configured.
 */
export function useSourceVerification(
  subject: string,
  network: "mainnet" | "testnet",
) {
  const gql = useSuiClientsContext().graphql[network];
  const cfg = attestationConfig(network);
  const { attestors } = useTrustedAttestors(network);
  const verifiers = attestors.filter((a) => a.role === "source-verification");

  return useQuery({
    queryKey: [
      AppQueryKeys.SOURCE_VERIFICATIONS,
      network,
      subject,
      verifiers.map((v) => v.originalId),
    ],
    enabled: !!cfg && verifiers.length > 0 && !!subject,
    queryFn: async (): Promise<SourceVerification[]> => {
      const box = boxAddress(cfg!.registryPkg, cfg!.registryId, subject);
      const out: SourceVerification[] = [];
      for (const verifier of verifiers) {
        const types = await enumerateAttestationTypes(
          gql,
          verifier.lineage,
          cfg!.registryPkg,
        );
        for (const type of types) {
          for (const node of await queryBox(gql, type, box)) {
            const d = (node.asMoveObject?.contents?.json?.data ?? {}) as RawData;
            const gitUrl = str(d.git_url);
            const gitSha = str(d.git_sha);
            const subdir = str(d.subdir);
            // Skip a malformed attestation rather than render a broken card.
            if (!gitUrl || !gitSha || subdir === undefined) continue;
            out.push({
              id: node.address,
              verifier,
              gitUrl,
              gitSha,
              subdir,
              sourceHash: str(d.source_hash),
              toolchainVersion: str(d.toolchain_version),
            });
          }
        }
      }
      return out;
    },
  });
}

type BoxNode = {
  address: string;
  asMoveObject: {
    contents: { json?: { data?: unknown } | null } | null;
  } | null;
};

/** Page through every `Attestation<type>` owned by `box`. The query is a typed
 *  helper (explicit `after` param) so the cursor stays out of the response
 *  type's own inference. */
async function queryBox(gql: SuiGraphQLClient, type: string, box: string) {
  const page = (after: string | null) =>
    gql.query<{
      objects: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: BoxNode[];
      };
    }>({ query: BOX_TYPE_QUERY, variables: { type, owner: box, after } });

  const nodes: BoxNode[] = [];
  let after: string | null = null;
  do {
    const res = await page(after);
    if (res.errors?.length) {
      throw new Error(`GraphQL query failed: ${res.errors[0]?.message}`);
    }
    nodes.push(...(res.data?.objects?.nodes ?? []));
    const pageInfo = res.data?.objects?.pageInfo;
    after = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  } while (after);
  return nodes;
}
