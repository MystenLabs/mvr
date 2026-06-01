import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import type { SuiClient } from "@mysten/sui/client";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { MvrHeader } from "@/lib/utils";
import {
  attestationConfig,
  attestorFor,
  boxAddress,
  isEffective,
  isNegative,
  toAttestationInfo,
  type AttestationConfig,
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

/** A dependency's effective vulnerability, surfaced on a dependent package. */
export interface InheritedVuln {
  attestation: DisplayedAttestation;
  /** The dependency package the vulnerability is attested about. */
  viaPackageId: string;
  /** That dependency's MVR name, if it resolves. */
  viaName?: string;
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
  const owner = boxAddress(cfg.registryId, subject);
  const trustedTypes = await resolveTrustedTypes(client, cfg);
  if (trustedTypes.length === 0) return [];

  // 1. Fetch only attestations of trusted types (server-side MatchAny).
  const infos: AttestationInfo[] = [];
  let cursor: string | null | undefined = null;
  do {
    const page = await client.getOwnedObjects({
      owner,
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

  // 2. Display-gate (drop trusted-but-undisplayed types) and attribute each to
  //    its attester for grouping.
  const trusted = infos
    .map((info) => ({ info, attestor: attestorFor(cfg, info.innerType) }))
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

/**
 * Vulnerabilities inherited from `subject`'s dependencies: a dependency's
 * effective negative attestations surface on its dependents (the negative dual
 * of `requires` — see CONVENTIONS.md `polarity`). Dependencies come from MVR;
 * the per-dependency reads are the same trusted-attestation reads as above.
 */
export function useInheritedVulns(
  subject: string | undefined,
  network: "mainnet" | "testnet",
) {
  const clients = useSuiClientsContext();
  const client = clients[network];
  const endpoint = clients.mvrEndpoints[network];
  const cfg = attestationConfig();

  return useQuery({
    queryKey: [AppQueryKeys.ATTESTATIONS, "inherited", network, subject],
    enabled: !!subject && !!cfg,
    queryFn: async (): Promise<InheritedVuln[]> => {
      // 1. Direct dependencies (from MVR).
      const res = await fetch(
        `${endpoint}/v1/package-address/${subject}/dependencies`,
        MvrHeader(),
      );
      const deps: string[] = res.ok ? ((await res.json()).dependencies ?? []) : [];
      if (!deps.length) return [];

      // 2. Each dependency's effective negative attestations.
      const perDep = await Promise.all(
        deps.map(async (dep) => {
          const atts = await fetchTrustedAttestations(client, cfg!, dep);
          return atts
            .filter((a) => a.effective && isNegative(a.info))
            .map<InheritedVuln>((a) => ({ attestation: a, viaPackageId: dep }));
        }),
      );
      const inherited = perDep.flat();
      if (!inherited.length) return inherited;

      // 3. Best-effort dependency names for the provenance note.
      try {
        const body = await fetch(`${endpoint}/v1/reverse-resolution/bulk`, {
          method: "POST",
          ...MvrHeader({ "Content-Type": "application/json" }),
          body: JSON.stringify({ package_ids: deps }),
        }).then((r) => r.json());
        const nameByAddr: Record<string, string | undefined> = {};
        for (const [addr, r] of Object.entries(body.resolution ?? {})) {
          nameByAddr[normalizeSuiAddress(addr)] = (r as { name?: string })?.name;
        }
        for (const v of inherited) {
          v.viaName = nameByAddr[normalizeSuiAddress(v.viaPackageId)];
        }
      } catch {
        // names are optional; fall back to the package id in the UI
      }
      return inherited;
    },
  });
}

/** An attestation issued *by* a package, and the subject it is about. */
export interface IssuedAttestation {
  info: AttestationInfo;
  /** The subject (package) the attestation is about. */
  subject: string;
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

      // Re-read each for Display + effectiveness; drop undisplayed types.
      const fetchById = fetchByIdFor(client);
      const ctx: ConventionsContext = { fetchById };
      const out: IssuedAttestation[] = [];
      for (const [id, subject] of subjectById) {
        const info = await fetchById(id).catch(() => null);
        if (!info || Object.keys(info.display).length === 0) continue;
        out.push({ info, subject: normalizeSuiAddress(subject), effective: await isEffective(info, ctx) });
      }
      return out;
    },
  });
}
