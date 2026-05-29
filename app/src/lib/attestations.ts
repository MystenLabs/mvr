// Reading package attestations from the attestation registry. This is a pure
// chain read (no MVR backend): derive the per-subject Box address and list the
// `Attestation<T>` objects it owns, keeping only those from trusted attesters.
// See ATTESTATION-INTEGRATION.md.

import { deriveObjectID, fromHex, normalizeSuiAddress } from "@mysten/sui/utils";
import type { SuiObjectResponse } from "@mysten/sui/client";

// === Config (NEXT_PUBLIC_ATTESTATION_CONFIG, JSON) ===

export interface TrustedAttestor {
  /** Human-readable label, shown as the attester heading. */
  name: string;
  /** Original publish id of the attester package — the trust anchor. */
  originalId: string;
  /** Every package-version id in the attester's lineage. Matching an
   *  attestation's inner-type package against this set is equivalent to
   *  resolving that package's original id (the on-chain `attester_of` rule).
   *  M2 seeds this directly; M3 derives it via GraphQL `packageVersions`. */
  lineage: string[];
}

export interface AttestationConfig {
  /** attestation_registry package id (the `Attestation<>` wrapper type). */
  registryPkg: string;
  /** The shared Registry object id — parent for per-subject Box derivation. */
  registryId: string;
  trustedAttestors: TrustedAttestor[];
}

let cached: AttestationConfig | null | undefined;

/** Parse the attestation config from env, or null if unset (production). */
export function attestationConfig(): AttestationConfig | null {
  if (cached === undefined) {
    const raw = process.env.NEXT_PUBLIC_ATTESTATION_CONFIG;
    cached = raw ? (JSON.parse(raw) as AttestationConfig) : null;
  }
  return cached;
}

// === Box address ===

/** Address of the per-subject `Box`, mirroring `derived_object::derive_address`. */
export function boxAddress(registryId: string, subject: string): string {
  const subjectBytes = fromHex(normalizeSuiAddress(subject).slice(2));
  return deriveObjectID(registryId, "0x2::object::ID", subjectBytes);
}

// === Attestation info + mapping ===

export interface AttestationInfo {
  id: string;
  /** Full object type, `…::attestation_registry::Attestation<T>`. */
  type: string;
  /** The inner type `T`, e.g. `0xAUD::audit::Audit`. */
  innerType: string;
  /** Server-rendered Display v2 fields (all values are strings). */
  display: Record<string, unknown>;
}

const ATTESTATION_RE = /::attestation_registry::Attestation<(.+)>$/;

/**
 * Map a `getOwnedObjects`/`getObject` response into `AttestationInfo`, or null
 * if it isn't a well-formed `Attestation<T>`. JSON-RPC nests Display fields
 * under `data.display.data`.
 */
export function toAttestationInfo(resp: SuiObjectResponse): AttestationInfo | null {
  const d = resp.data;
  if (!d?.type) return null;
  const m = d.type.match(ATTESTATION_RE);
  if (!m) return null;
  return {
    id: d.objectId,
    type: d.type,
    innerType: m[1]!,
    display: (d.display?.data ?? {}) as Record<string, unknown>,
  };
}

/** The defining (origin) package id of an inner type string. */
export function innerTypePackage(innerType: string): string {
  return normalizeSuiAddress(innerType.split("::")[0]!);
}

/** The trusted attester whose lineage defines `innerType`, if any. */
export function attestorFor(
  cfg: AttestationConfig,
  innerType: string,
): TrustedAttestor | undefined {
  const pkg = innerTypePackage(innerType);
  return cfg.trustedAttestors.find((a) =>
    a.lineage.some((id) => normalizeSuiAddress(id) === pkg),
  );
}

// === Conventions (effectiveness) — ported from the attestation-registry repo's
// ts/lib/conventions.ts. Operates purely on Display fields + ids. ===

export interface ConventionsContext {
  fetchById: (id: string) => Promise<AttestationInfo>;
  now?: () => number;
}

/** `active` renders as "true"/"false"; absent defaults to active. */
function readActive(att: AttestationInfo): boolean {
  const raw = att.display["active"];
  if (raw === true || raw === "true") return true;
  if (raw === false || raw === "false") return false;
  return true;
}

/** `expires_at` as Unix-ms, or null if absent/unparseable. */
function readExpiresAt(att: AttestationInfo): number | null {
  const raw = att.display["expires_at"];
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const asNum = Number(raw);
    if (!Number.isNaN(asNum) && asNum > 0) return asNum;
    const asDate = Date.parse(raw);
    if (!Number.isNaN(asDate)) return asDate;
  }
  return null;
}

/** `requires` as a list of attestation ids (a JSON-array string over JSON-RPC). */
function readRequires(att: AttestationInfo): string[] {
  const raw = att.display["requires"];
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string");
      }
    } catch {
      // not JSON; ignore
    }
  }
  return [];
}

/**
 * An attestation is effective iff it is active, unexpired, and every
 * attestation it `requires` is (transitively) effective. Cycles — which can't
 * occur on-chain but could in malformed Display data — are treated as
 * ineffective.
 */
export async function isEffective(
  att: AttestationInfo,
  ctx: ConventionsContext,
  visited: Set<string> = new Set(),
): Promise<boolean> {
  if (!readActive(att)) return false;

  const expiresAt = readExpiresAt(att);
  const now = (ctx.now ?? Date.now)();
  if (expiresAt !== null && now >= expiresAt) return false;

  const required = readRequires(att);
  if (required.length > 0) {
    if (visited.has(att.id)) return false; // cycle
    const next = new Set(visited);
    next.add(att.id);
    for (const reqId of required) {
      const req = await ctx.fetchById(reqId);
      if (!(await isEffective(req, ctx, next))) return false;
    }
  }
  return true;
}
