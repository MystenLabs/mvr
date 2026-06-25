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
  toAttestationInfo,
  type AttestationConfig,
  type AttestationInfo,
  type TrustedAttestor,
} from "@/lib/attestations";

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
 * attesters. Reads the per-subject Box directly over JSON-RPC (no MVR backend),
 * then filters to trusted, displayed attestations client-side (see
 * `fetchBoxAttestations`).
 */
export async function fetchTrustedAttestations(
  client: SuiClient,
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
  client: SuiClient,
  cfg: AttestationConfig,
  subject: string,
): Promise<AttributedAttestation[]> {
  const revokedBox = revokedBoxAddress(cfg.registryPkg, cfg.registryId, subject);
  return fetchBoxAttestations(client, cfg, revokedBox);
}

/**
 * Trusted, displayed attestations owned by `boxAddr`, attributed to their
 * attester. Shared by the active-box and revoked-box reads. Fetches every
 * `Attestation<T>` on the box (a `MoveModule` filter on the registry's
 * `attestations` module) and filters client-side: keep only those from a
 * configured trusted attester (`attestorFor`) that carry a registered Display.
 * Untrusted attesters can transfer junk into a box; we just drop it here. (A
 * server-side trusted-type filter would avoid downloading that junk — a possible
 * spam-resistance optimization if it ever matters.)
 */
async function fetchBoxAttestations(
  client: SuiClient,
  cfg: AttestationConfig,
  boxAddr: string,
): Promise<AttributedAttestation[]> {
  const infos: AttestationInfo[] = [];
  let cursor: string | null | undefined = null;
  do {
    const page = await client.getOwnedObjects({
      owner: boxAddr,
      filter: {
        MoveModule: { package: cfg.registryPkg, module: "attestations" },
      },
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

/**
 * The `Attestation<T>` type strings for every `store` type `T` defined across
 * the given package lineage. Used by the reverse (Issued) read's per-type GraphQL
 * query. Querying each version covers types by their defining (canonical) id;
 * non-canonical combinations match no objects.
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
            `${registryPkg}::attestations::Attestation<${pkg}::${moduleName}::${structName}>`,
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

const ISSUED_QUERY = `query($type: String!) {
  objects(filter: { type: $type }) {
    nodes { address asMoveObject { contents { json } } }
  }
}`;

/**
 * The attestations *issued by* `pkg` — the reverse of the per-subject read.
 * Uses GraphQL `objects(type:)` to find every `Attestation<T>` of the package's
 * types across all Boxes (the object's `subject` field says who it's about), then
 * re-reads each over JSON-RPC for Display + owner. Only configured trusted
 * attesters issue attestations in the demo, so a package not in the trust config
 * returns nothing.
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
      // attestation is revoked iff it now lives in its subject's revoked box
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
        const revokedBox = revokedBoxAddress(cfg!.registryPkg, cfg!.registryId, subject);
        const revoked = !!owner && normalizeSuiAddress(owner) === normalizeSuiAddress(revokedBox);
        out.push({
          info,
          subject: normalizeSuiAddress(subject),
          revoked,
        });
      }
      return out;
    },
  });
}
