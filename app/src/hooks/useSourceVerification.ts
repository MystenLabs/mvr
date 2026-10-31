import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import type { SuiGraphQLClient } from "@mysten/sui/graphql";
import {
  attestationConfig,
  subjectAddress,
  isRevoked,
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
const SUBJECT_TYPE_QUERY = `query($type: String!, $owner: SuiAddress!, $after: String) {
  objects(filter: { type: $type, owner: $owner }, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { address asMoveObject { contents { json } } }
  }
}`;

const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

/**
 * Read live source-verification claims from configured verifiers at the
 * subject's address. GraphQL returns the schema's structured source fields;
 * revoked_at_ms determines whether the claim is live.
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
      const owner = subjectAddress(cfg!.registryId, subject);
      const out: SourceVerification[] = [];
      for (const verifier of verifiers) {
        const types = await enumerateAttestationTypes(
          gql,
          verifier.lineage,
          cfg!.registryPkg,
        );
        for (const type of types) {
          for (const node of await querySubject(gql, type, owner)) {
            const json = node.asMoveObject?.contents?.json;
            if (isRevoked(json?.revoked_at_ms)) continue;
            const d = (json?.data ?? {}) as RawData;
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

type SubjectNode = {
  address: string;
  asMoveObject: {
    contents: { json?: { data?: unknown; revoked_at_ms?: unknown } | null } | null;
  } | null;
};

/** Read every page of a schema's attestations at the subject address. */
async function querySubject(gql: SuiGraphQLClient, type: string, owner: string) {
  const page = (after: string | null) =>
    gql.query<{
      objects: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: SubjectNode[];
      };
    }>({ query: SUBJECT_TYPE_QUERY, variables: { type, owner, after } });

  const nodes: SubjectNode[] = [];
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
