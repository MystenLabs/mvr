import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import type { SuiGraphQLClient } from "@mysten/sui/graphql";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  attestationConfig,
  attestorFor,
  boxAddress,
  revokedBoxAddress,
  toAttestationInfo,
  type AttestationConfig,
  type AttestationInfo,
  type TrustedAttestor,
} from "@/lib/attestations";
import { useGetMvrVersionAddresses } from "./useGetMvrVersionAddresses";
import { ResolvedName } from "./mvrResolution";
import { fetchAllPages } from "@/utils/query";

/** A trusted attestation attributed to the attester whose lineage defines its
 *  type — the shared base for the active-box and revoked-box reads. */
export interface AttributedAttestation {
  info: AttestationInfo;
  /** The trusted attester this attestation's type belongs to. */
  attestor: TrustedAttestor;
}

/** A trusted, display-gated attestation ready to render. (Currently the same
 *  shape as AttributedAttestation; kept as a distinct name on the render path.) */
export type DisplayedAttestation = AttributedAttestation;

/**
 * Core read: the attestations about `subject` from the configured trusted
 * attesters. Reads the per-subject Box directly from the chain (no MVR backend),
 * then filters to trusted, displayed attestations client-side (see
 * `fetchBoxAttestations`).
 */
export async function fetchTrustedAttestations(
  client: SuiGrpcClient,
  cfg: AttestationConfig,
  subject: string,
): Promise<DisplayedAttestation[]> {
  // Revocation is handled by box membership — a revoked attestation isn't in
  // the active box at all, so everything read here is live.
  const box = boxAddress(cfg.registryPkg, cfg.registryId, subject);
  return fetchBoxAttestations(client, cfg, box);
}

/**
 * The revoked attestations about `subject`: the trusted, displayed ones that
 * `revoke` moved out of the active box into the subject's revoked box. Same
 * trusted/Display filter, just against the revoked-box address.
 */
export async function fetchRevokedAttestations(
  client: SuiGrpcClient,
  cfg: AttestationConfig,
  subject: string,
): Promise<AttributedAttestation[]> {
  const revokedBox = revokedBoxAddress(cfg.registryPkg, cfg.registryId, subject);
  return fetchBoxAttestations(client, cfg, revokedBox);
}

/**
 * Trusted, displayed attestations owned by `boxAddr`, attributed to their
 * attester. Shared by the active-box and revoked-box reads. Lists every object
 * the box owns (`listOwnedObjects`) — a box holds only `Attestation<T>`,
 * transferred to it — and filters client-side: keep only those from a configured
 * trusted attester (`attestorFor`) that carry a registered Display. Untrusted
 * attesters can transfer junk into a box; `toAttestationInfo` and the trust
 * filter drop it here.
 */
async function fetchBoxAttestations(
  client: SuiGrpcClient,
  cfg: AttestationConfig,
  boxAddr: string,
): Promise<AttributedAttestation[]> {
  const objects = await fetchAllPages({
    asyncFn: async (cursor) => {
      const page = await client.core.listOwnedObjects({
        owner: boxAddr,
        cursor,
        include: { display: true },
      });
      return { items: page.objects, hasNextPage: page.hasNextPage, cursor: page.cursor };
    },
  });

  return objects
    .map((obj) => toAttestationInfo(obj))
    .filter((info): info is AttestationInfo => info !== null)
    .map((info) => ({ info, attestor: attestorFor(cfg, info.innerType) }))
    .filter(
      (x): x is AttributedAttestation =>
        !!x.attestor && Object.keys(x.info.display).length > 0,
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
  const cfg = attestationConfig();

  return useQuery({
    queryKey: [AppQueryKeys.ATTESTATIONS, network, subject],
    enabled: !!subject && !!cfg,
    queryFn: () => fetchTrustedAttestations(client, cfg!, subject!),
  });
}

/** The revoked attestations about `subject` (read from the revoked box). */
export function useGetRevokedAttestations(
  subject: string | undefined,
  network: "mainnet" | "testnet",
) {
  const client = useSuiClientsContext()[network];
  const cfg = attestationConfig();

  return useQuery({
    queryKey: [AppQueryKeys.ATTESTATIONS, "revoked", network, subject],
    enabled: !!subject && !!cfg,
    queryFn: () => fetchRevokedAttestations(client, cfg!, subject!),
  });
}

/** An attestation issued *by* a package, and the subject it is about. */
export interface IssuedAttestation {
  info: AttestationInfo;
  /** The subject (package) the attestation is about. */
  subject: string;
  /** Moved to the subject's revoked box (vs. its active box). */
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
 * all Boxes (the object's `subject` field says who it's about), then re-reads
 * each via the gRPC core client for Display + owner. Works for ANY package, not just
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
  const cfg = attestationConfig();
  // The package's own types may be defined in any version, so enumerate across
  // its whole mvr lineage rather than just the resolved version.
  const { data: versions } = useGetMvrVersionAddresses(
    name?.name ?? "",
    name?.version ?? 0,
    network,
  );
  const lineage = (versions ?? []).map((v) => v.address);

  return useQuery({
    queryKey: [AppQueryKeys.ATTESTATIONS, "issued", network, name?.package_address, lineage],
    enabled: !!name && !!cfg && lineage.length > 0,
    queryFn: async (): Promise<{ items: IssuedAttestation[]; failures: number }> => {
      const types = await enumerateAttestationTypes(gql, lineage, cfg!.registryPkg);

      // Reverse query: page through every object of each issued type, across all
      // Boxes. A typed helper (explicit `after` param) keeps the cursor out of
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

      // Re-read each for Display + owner; drop undisplayed types. An issued
      // attestation is revoked iff it now lives in its subject's revoked box
      // rather than the active box — the read-by-type Issued view is the one
      // place that recovers revocation from ownership, since the object itself
      // carries no status field. A re-read that fails (vs. a legitimately
      // undisplayed/non-attestation object) is counted so the UI can flag that
      // some attestations couldn't be loaded rather than silently dropping them.
      const out: IssuedAttestation[] = [];
      let failures = 0;
      for (const [id, subject] of subjectById) {
        let object;
        try {
          const res = await client.core.getObject({
            objectId: id,
            include: { display: true },
          });
          object = res.object;
        } catch {
          failures++;
          continue;
        }
        const info = toAttestationInfo(object);
        if (!info || Object.keys(info.display).length === 0) continue;
        const owner = ownerAddress(object.owner);
        const revokedBox = revokedBoxAddress(cfg!.registryPkg, cfg!.registryId, subject);
        const revoked = !!owner && normalizeSuiAddress(owner) === normalizeSuiAddress(revokedBox);
        out.push({
          info,
          subject: normalizeSuiAddress(subject),
          revoked,
        });
      }
      return { items: out, failures };
    },
  });
}

/** The address of an address-owned object, or undefined for other owner kinds.
 *  Tolerant of the SDK's owner representation. */
function ownerAddress(owner: unknown): string | undefined {
  if (owner && typeof owner === "object") {
    const o = owner as Record<string, unknown>;
    if (typeof o.AddressOwner === "string") return o.AddressOwner;
    if (o.$kind === "Address" && typeof o.address === "string") return o.address;
  }
  return undefined;
}
