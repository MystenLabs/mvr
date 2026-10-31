import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import type { SuiGraphQLClient } from "@mysten/sui/graphql";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  attestationConfig,
  attestorFor,
  subjectAddress,
  toAttestationInfo,
  type AttestationConfig,
  type AttestationInfo,
  type ResolvedAttestor,
} from "@/lib/attestations";
import { useTrustedAttestors } from "./useTrustedAttestors";
import { fetchPackageVersions } from "./useGetMvrVersionAddresses";
import { ResolvedName } from "./mvrResolution";
import { fetchAllPages } from "@/utils/query";

/** A trusted attestation attributed to its schema's defining package. */
export interface AttributedAttestation {
  info: AttestationInfo;
  /** The trusted attester this attestation's type belongs to. */
  attestor: ResolvedAttestor;
}

/** A trusted, display-gated attestation ready to render. (Currently the same
 *  shape as AttributedAttestation; kept as a distinct name on the render path.) */
export type DisplayedAttestation = AttributedAttestation;

/** Read live, displayed attestations from the configured trusted attesters. */
export async function fetchTrustedAttestations(
  client: SuiGrpcClient,
  cfg: AttestationConfig,
  attestors: ResolvedAttestor[],
  subject: string,
): Promise<DisplayedAttestation[]> {
  const items = await fetchSubjectAttestations(client, cfg, attestors, subject);
  return items.filter(({ info }) => !info.revoked);
}

/** Read revoked attestations using the same trust and Display filters. */
export async function fetchRevokedAttestations(
  client: SuiGrpcClient,
  cfg: AttestationConfig,
  attestors: ResolvedAttestor[],
  subject: string,
): Promise<AttributedAttestation[]> {
  const items = await fetchSubjectAttestations(client, cfg, attestors, subject);
  return items.filter(({ info }) => info.revoked);
}

/** Read every page at the subject address and apply registry, trust, and Display filters. */
async function fetchSubjectAttestations(
  client: SuiGrpcClient,
  cfg: AttestationConfig,
  attestors: ResolvedAttestor[],
  subject: string,
): Promise<AttributedAttestation[]> {
  const objects = await fetchAllPages({
    asyncFn: async (cursor) => {
      const page = await client.core.listOwnedObjects({
        owner: subjectAddress(cfg.registryId, subject),
        cursor,
        include: { display: true, json: true },
      });
      return { items: page.objects, hasNextPage: page.hasNextPage, cursor: page.cursor };
    },
  });

  return objects
    .map((obj) => toAttestationInfo(obj, cfg.registryPkg))
    .filter((info): info is AttestationInfo => info !== null)
    .map((info) => ({ info, attestor: attestorFor(attestors, info.innerType) }))
    .filter(
      (x): x is AttributedAttestation =>
        !!x.attestor &&
        // Source-verification attesters render in the source panel, not as
        // endorsement cards — keep them out of the Security-tab reads.
        x.attestor.role !== "source-verification" &&
        Object.keys(x.info.display).length > 0,
    );
}

/**
 * The `Attestation<T>` type strings for every `store` type `T` defined across
 * the given package lineage. Used by the reverse (Issued) read's per-type GraphQL
 * query. Querying each version covers types by their defining (canonical) id;
 * non-canonical combinations match no objects.
 */
const PACKAGE_STRUCTS_QUERY = `query($pkg: SuiAddress!) {
  object(address: $pkg) {
    asMovePackage {
      modules { nodes { name datatypes { nodes { name asMoveStruct { abilities } } } } }
    }
  }
}`;

export async function enumerateAttestationTypes(
  gql: SuiGraphQLClient,
  lineageIds: string[],
  registryPkg: string,
): Promise<string[]> {
  const lineage = [...new Set(lineageIds.map((id) => normalizeSuiAddress(id)))];
  const types = new Set<string>();
  for (const pkg of lineage) {
    const res = await gql.query<{
      object: {
        asMovePackage: {
          modules: {
            nodes: {
              name: string;
              datatypes: {
                nodes: { name: string; asMoveStruct: { abilities: string[] } | null }[];
              };
            }[];
          };
        } | null;
      } | null;
    }>({ query: PACKAGE_STRUCTS_QUERY, variables: { pkg } });
    if (res.errors?.length) {
      throw new Error(`GraphQL query failed: ${res.errors[0]?.message}`);
    }
    for (const mod of res.data?.object?.asMovePackage?.modules?.nodes ?? []) {
      for (const dt of mod.datatypes?.nodes ?? []) {
        // gRPC/GraphQL report abilities in UPPER_CASE (e.g. "STORE").
        if (dt.asMoveStruct?.abilities.includes("STORE")) {
          types.add(
            `${registryPkg}::attestations::Attestation<${pkg}::${mod.name}::${dt.name}>`,
          );
        }
      }
    }
  }
  return [...types];
}

/** The attestations about `subject` from the configured trusted attesters. */
export function useGetAttestations(
  subject: string | undefined,
  network: "mainnet" | "testnet",
) {
  const client = useSuiClientsContext()[network];
  const cfg = attestationConfig(network);
  const { attestors } = useTrustedAttestors(network);

  return useQuery({
    queryKey: [AppQueryKeys.ATTESTATIONS, network, subject, attestors.map((a) => a.originalId)],
    enabled: !!subject && !!cfg && attestors.length > 0,
    queryFn: () => fetchTrustedAttestations(client, cfg!, attestors, subject!),
  });
}

/** The revoked attestations about `subject`. */
export function useGetRevokedAttestations(
  subject: string | undefined,
  network: "mainnet" | "testnet",
) {
  const client = useSuiClientsContext()[network];
  const cfg = attestationConfig(network);
  const { attestors } = useTrustedAttestors(network);

  return useQuery({
    queryKey: [AppQueryKeys.ATTESTATIONS, "revoked", network, subject, attestors.map((a) => a.originalId)],
    enabled: !!subject && !!cfg && attestors.length > 0,
    queryFn: () => fetchRevokedAttestations(client, cfg!, attestors, subject!),
  });
}

/** An attestation issued *by* a package, and the subject it is about. */
export interface IssuedAttestation {
  info: AttestationInfo;
  /** The subject (package) the attestation is about. */
  subject: string;
  /** Whether the registry has set revoked_at_ms. */
  revoked: boolean;
}

const ISSUED_QUERY = `query($type: String!, $after: String) {
  objects(filter: { type: $type }, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { address asMoveObject { contents { json } } }
  }
}`;

/**
 * The attestations *issued by* a package — the reverse of the per-subject read.
 * Enumerates the package's own `store` types across its mvr version lineage, uses
 * GraphQL `objects(type:)` to find every `Attestation<T>` of those types across
 * all subject addresses, then re-reads each via the gRPC core client for
 * Display and current revocation status. Works for ANY package, not just
 * configured trusted attesters — the trust config governs only how the UI frames
 * the result (see the Issued tab's not-trusted warning), not whether it loads.
 */
export function useIssuedAttestations(
  name: ResolvedName | undefined,
  network: "mainnet" | "testnet",
) {
  const clients = useSuiClientsContext();
  const client = clients[network];
  const gql = clients.graphql[network];
  const cfg = attestationConfig(network);
  return useQuery({
    queryKey: [AppQueryKeys.ATTESTATIONS, "issued", network, name?.package_address, cfg?.registryPkg],
    enabled: !!name && !!cfg,
    queryFn: async (): Promise<{ items: IssuedAttestation[]; failures: number }> => {
      // Schema origin IDs may belong to any release, including versions not
      // loaded by the MVR versions tab. Read the complete on-chain lineage.
      const versions = await fetchPackageVersions(gql, name!.package_address);
      const lineage = [name!.package_address, ...versions.map((v) => v.address)];
      const types = await enumerateAttestationTypes(gql, lineage, cfg!.registryPkg);

      // Reverse query: page through every object of each issued type.
      // A typed helper (explicit `after` param) keeps the cursor out of
      // the query's own return-type inference.
      const issuedPage = (type: string, after: string | null) =>
        gql.query<{
          objects: {
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
            nodes: {
              address: string;
              asMoveObject: { contents: { json: { subject?: string } } | null } | null;
            }[];
          };
        }>({ query: ISSUED_QUERY, variables: { type, after } });

      const subjectById = new Map<string, string>();
      for (const type of types) {
        let after: string | null = null;
        do {
          const res = await issuedPage(type, after);
          // Surface GraphQL errors instead of treating a failed query as "no
          // results" — e.g. the localnet GraphQL's "Request is outside consistent
          // range" when its consistent store lags. Swallowing it renders a
          // failure as an empty Issued tab, which is misleading.
          if (res.errors?.length) {
            throw new Error(`GraphQL query failed: ${res.errors[0]?.message}`);
          }
          for (const node of res.data?.objects?.nodes ?? []) {
            const subject = node.asMoveObject?.contents?.json?.subject;
            if (node.address && subject) subjectById.set(node.address, subject);
          }
          const pageInfo = res.data?.objects?.pageInfo;
          after = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
        } while (after);
      }
      if (subjectById.size === 0) return { items: [], failures: 0 };

      // Re-read status with Display so an indexed pre-revocation record cannot
      // override the current chain state. Count read/parse failures separately
      // from objects intentionally omitted because they have no Display.
      const out: IssuedAttestation[] = [];
      let failures = 0;
      for (const [id, subject] of subjectById) {
        try {
          const { object } = await client.core.getObject({
            objectId: id,
            include: { display: true, json: true },
          });
          const info = toAttestationInfo(object, cfg!.registryPkg);
          if (!info || Object.keys(info.display).length === 0) continue;
          out.push({
            info,
            subject: normalizeSuiAddress(subject),
            revoked: info.revoked,
          });
        } catch {
          failures++;
        }
      }
      return { items: out, failures };
    },
  });
}
