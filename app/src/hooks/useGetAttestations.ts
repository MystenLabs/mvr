import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import type { SuiClient } from "@mysten/sui/client";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  attestationConfig,
  attestorFor,
  boxAddress,
  revokedBoxAddress,
  isEffective,
  toAttestationInfo,
  type AttestationConfig,
  type AttestationInfo,
  type TrustedAttestor,
} from "@/lib/attestations";

/** A trusted attestation attributed to the attester whose lineage defines its
 *  type — the shared base for the active-box and revoked-sink reads. */
export interface AttributedAttestation {
  info: AttestationInfo;
  /** The trusted attester this attestation's type belongs to. */
  attestor: TrustedAttestor;
}

export interface DisplayedAttestation extends AttributedAttestation {
  /** Effectiveness per the conventions (unexpired; revocation is box membership). */
  effective: boolean;
}

/**
 * Core read: the attestations about `subject` from the configured trusted
 * attesters, with effectiveness. Reads the per-subject Box directly over
 * JSON-RPC (no MVR backend).
 *
 * Spam-resistant (M3): rather than fetch every `Attestation<*>` on the box and
 * filter client-side, it asks the node for only the exact trusted types via a
 * `MatchAny` `StructType` filter — so attestations from untrusted attesters are
 * never returned. The trusted type set is the `Attestation<T>` for every store
 * type `T` defined by a trusted attester's lineage (see `resolveTrustedTypes`).
 * A read-time Display-gate still drops trusted-but-undisplayed types.
 */
export async function fetchTrustedAttestations(
  client: SuiClient,
  cfg: AttestationConfig,
  subject: string,
): Promise<DisplayedAttestation[]> {
  const box = boxAddress(cfg.registryPkg, cfg.registryId, subject);
  const trusted = await fetchBoxAttestations(client, cfg, box);
  // Effectiveness: unexpired. Revocation is handled by box membership — a
  // revoked attestation isn't in this box at all.
  return trusted.map((a) => ({ ...a, effective: isEffective(a.info) }));
}

/**
 * The revoked attestations about `subject`: the trusted, displayed ones that
 * `revoke` moved out of the active box into the subject's revoked sink. Same
 * trusted/Display filter, just against the sink address.
 */
export async function fetchRevokedAttestations(
  client: SuiClient,
  cfg: AttestationConfig,
  subject: string,
): Promise<AttributedAttestation[]> {
  const sink = revokedBoxAddress(cfg.registryPkg, cfg.registryId, subject);
  return fetchBoxAttestations(client, cfg, sink);
}

/**
 * Trusted, displayed attestations owned by `boxAddr`, attributed to their
 * attester. Shared by the active-box and revoked-sink reads. Uses the gRPC
 * `MatchAny` `StructType` filter so untrusted attesters are never fetched; a
 * read-time Display-gate drops trusted-but-undisplayed types.
 */
async function fetchBoxAttestations(
  client: SuiClient,
  cfg: AttestationConfig,
  boxAddr: string,
): Promise<AttributedAttestation[]> {
  const trustedTypes = await resolveTrustedTypes(client, cfg);
  if (trustedTypes.length === 0) return [];

  const infos: AttestationInfo[] = [];
  let cursor: string | null | undefined = null;
  do {
    const page = await client.getOwnedObjects({
      owner: boxAddr,
      filter: { MatchAny: trustedTypes.map((StructType) => ({ StructType })) },
      options: { showType: true, showDisplay: true },
      cursor,
    });
    for (const r of page.data) {
      const info = toAttestationInfo(r);
      if (info) infos.push(info);
    }
    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  return infos
    .map((info) => ({ info, attestor: attestorFor(cfg, info.innerType) }))
    .filter(
      (x): x is AttributedAttestation =>
        !!x.attestor && Object.keys(x.info.display).length > 0,
    );
}

// Cache the trusted type set per config — the lineage is static, so this only
// changes when an attester upgrades (re-load the app to refresh).
const trustedTypesCache = new Map<string, Promise<string[]>>();

/**
 * The exact set of trusted `Attestation<T>` type strings: for every package in
 * a trusted attester's lineage, every `store` struct it defines becomes a
 * candidate `T`. Querying each lineage version covers types by their defining
 * (canonical) id; non-canonical combinations simply match no objects.
 */
export function resolveTrustedTypes(
  client: SuiClient,
  cfg: AttestationConfig,
): Promise<string[]> {
  const lineage = cfg.trustedAttestors.flatMap((a) => a.lineage);
  const key = `${cfg.registryPkg}|${[...new Set(lineage.map((id) => normalizeSuiAddress(id)))].join(",")}`;
  const cached = trustedTypesCache.get(key);
  if (cached) return cached;
  const promise = enumerateAttestationTypes(client, lineage, cfg.registryPkg);
  trustedTypesCache.set(key, promise);
  return promise;
}

/**
 * The `Attestation<T>` type strings for every `store` type `T` defined across
 * the given package lineage. Querying each version covers types by their
 * defining (canonical) id; non-canonical combinations match no objects.
 */
export async function enumerateAttestationTypes(
  client: SuiClient,
  lineageIds: string[],
  registryPkg: string,
): Promise<string[]> {
  const lineage = [...new Set(lineageIds.map((id) => normalizeSuiAddress(id)))];
  const types = new Set<string>();
  for (const pkg of lineage) {
    const modules = await client.getNormalizedMoveModulesByPackage({ package: pkg });
    for (const [moduleName, mod] of Object.entries(modules)) {
      for (const [structName, struct] of Object.entries(mod.structs ?? {})) {
        if (struct.abilities.abilities.includes("Store")) {
          types.add(
            `${registryPkg}::attestation_registry::Attestation<${pkg}::${moduleName}::${structName}>`,
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

/** The revoked attestations about `subject` (read from the revoked sink). */
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
  /** Moved to the subject's revoked sink (vs. its active box). */
  revoked: boolean;
  /** Unexpired per the `expires_at` convention (independent of `revoked`). */
  effective: boolean;
}

const ISSUED_QUERY = `query($type: String!) {
  objects(filter: { type: $type }) {
    nodes { address asMoveObject { contents { json } } }
  }
}`;

/**
 * The attestations *issued by* `pkg` — the reverse of the per-subject read.
 * Uses GraphQL `objects(type:)` to find every `Attestation<T>` of the
 * package's types across all Boxes (the object's `subject` field says who it's
 * about), then re-reads each over JSON-RPC for Display + effectiveness. Only
 * configured trusted attesters issue attestations in the demo, so a package not
 * in the trust config returns nothing.
 */
export function useIssuedAttestations(
  pkg: string | undefined,
  network: "mainnet" | "testnet",
) {
  const clients = useSuiClientsContext();
  const client = clients[network];
  const gql = clients.graphql[network];
  const cfg = attestationConfig();

  return useQuery({
    queryKey: [AppQueryKeys.ATTESTATIONS, "issued", network, pkg],
    enabled: !!pkg && !!cfg,
    queryFn: async (): Promise<IssuedAttestation[]> => {
      const attestor = cfg!.trustedAttestors.find((a) =>
        a.lineage.some((id) => normalizeSuiAddress(id) === normalizeSuiAddress(pkg!)),
      );
      if (!attestor) return [];
      const types = await enumerateAttestationTypes(client, attestor.lineage, cfg!.registryPkg);

      // Reverse query: every object of each issued type, across all Boxes.
      const subjectById = new Map<string, string>();
      for (const type of types) {
        const res = await gql.query<{
          objects: {
            nodes: {
              address: string;
              asMoveObject: { contents: { json: { subject?: string } } | null } | null;
            }[];
          };
        }>({ query: ISSUED_QUERY, variables: { type } });
        for (const node of res.data?.objects?.nodes ?? []) {
          const subject = node.asMoveObject?.contents?.json?.subject;
          if (node.address && subject) subjectById.set(node.address, subject);
        }
      }
      if (subjectById.size === 0) return [];

      // Re-read each for Display + owner; drop undisplayed types. An issued
      // attestation is revoked iff it now lives in its subject's revoked sink
      // rather than the active box — the read-by-type Issued view is the one
      // place that recovers revocation from ownership, since the object itself
      // carries no status field.
      const out: IssuedAttestation[] = [];
      for (const [id, subject] of subjectById) {
        const resp = await client
          .getObject({ id, options: { showType: true, showDisplay: true, showOwner: true } })
          .catch(() => null);
        if (!resp) continue;
        const info = toAttestationInfo(resp);
        if (!info || Object.keys(info.display).length === 0) continue;
        const ownerField = resp.data?.owner;
        const owner =
          ownerField && typeof ownerField === "object" && "AddressOwner" in ownerField
            ? ownerField.AddressOwner
            : undefined;
        const sink = revokedBoxAddress(cfg!.registryPkg, cfg!.registryId, subject);
        const revoked = !!owner && normalizeSuiAddress(owner) === normalizeSuiAddress(sink);
        out.push({
          info,
          subject: normalizeSuiAddress(subject),
          revoked,
          effective: isEffective(info),
        });
      }
      return out;
    },
  });
}
