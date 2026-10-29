// Read attestations from the registry's derived subject address, filtering by
// trusted schema identity and the on-chain revoked_at_ms field.
// See ATTESTATION-INTEGRATION.md.

import { bcs } from "@mysten/sui/bcs";
import { deriveObjectID, normalizeSuiAddress } from "@mysten/sui/utils";
import type { SuiClientTypes } from "@mysten/sui/client";
import checkedInConfigs from "./attestation-config.json";

/** A 0x-prefixed Sui address. */
export type SuiAddress = string;
/** A 0x-prefixed object id. */
export type ObjectId = string;

// === Config (NEXT_PUBLIC_ATTESTATION_CONFIG, JSON) ===

export interface TrustedAttestor {
  /** Human-readable label, shown as the attester heading. */
  name: string;
  /** Optional brand icon URL (from trust config, never from on-chain data).
   *  Absent → the UI renders an initials avatar. */
  iconUrl?: string;
  /** Optional MVR name of the attester package, for linking to its page. */
  mvrName?: string;
  /** Original publish id of the attester package — the trust anchor. The full
   *  lineage (every version) is resolved from this at load; see
   *  `useTrustedAttestors`. */
  originalId: SuiAddress;
  /** How this attester's attestations are surfaced. Default (`undefined`) is an
   *  endorsement, shown as a card on the subject's Security tab.
   *  `"source-verification"` routes them out of that list and into the source
   *  panel next to the package's source link instead. This is a *consumer-side*
   *  decision (config, not the attester-asserted Display), so it can't be
   *  spoofed by an attestation claiming a role. */
  role?: "source-verification";
}

/** A trusted attester with every package version resolved from originalId.
 *  Match the schema's defining package against this lineage so types introduced
 *  in later upgrades retain the configured attester's identity. */
export interface ResolvedAttestor extends TrustedAttestor {
  lineage: SuiAddress[];
}

export interface AttestationConfig {
  /** attestations package id (the `Attestation<>` wrapper type). */
  registryPkg: SuiAddress;
  /** The shared Registry object ID, used to derive subject addresses. */
  registryId: ObjectId;
  trustedAttestors: TrustedAttestor[];
}

/** Per-network trust configs — the checked-in JSON's shape and the env override's
 *  shape are the same. A network with no entry keeps the feature dormant there. */
export type AttestationConfigs = Partial<
  Record<"mainnet" | "testnet", AttestationConfig>
>;

let cached: AttestationConfigs | undefined;

/**
 * All trust configs: the `NEXT_PUBLIC_ATTESTATION_CONFIG` env override (the local
 * demo) if set, else the checked-in `attestation-config.json`. Checked-in-as-code
 * (rather than an env var) is what lets a deployed build — a Vercel preview, say —
 * show attestations with no dashboard configuration; the override is the local
 * demo's, like `NEXT_PUBLIC_LOCAL_*` for the endpoints.
 */
function allConfigs(): AttestationConfigs {
  if (cached === undefined) {
    const raw = process.env.NEXT_PUBLIC_ATTESTATION_CONFIG;
    cached = raw
      ? (JSON.parse(raw) as AttestationConfigs)
      : (checkedInConfigs as AttestationConfigs);
  }
  return cached;
}

/** The trust config for `network`, or null when none is set there (the feature is
 *  dormant on that network). */
export function attestationConfig(
  network: "mainnet" | "testnet",
): AttestationConfig | null {
  const cfg = allConfigs()[network];
  return cfg && cfg.trustedAttestors.length > 0 ? cfg : null;
}

/** Every trusted attester across all networks — for the network-agnostic "trusted
 *  attestors" listing. Deduped by `mvrName` when set (one MVR app spans networks,
 *  each with its own package), else by `originalId`. */
export function allTrustedAttestors(): TrustedAttestor[] {
  const seen = new Set<string>();
  const out: TrustedAttestor[] = [];
  for (const cfg of Object.values(allConfigs())) {
    for (const a of cfg?.trustedAttestors ?? []) {
      const id = a.mvrName ?? normalizeSuiAddress(a.originalId);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(a);
      }
    }
  }
  return out;
}

/** Derive the owner of all attestations for a subject, including revoked ones. */
export function subjectAddress(
  registryId: ObjectId,
  subject: SuiAddress,
): ObjectId {
  return deriveObjectID(
    registryId,
    "0x2::object::ID",
    bcs.Address.serialize(normalizeSuiAddress(subject)).toBytes(),
  );
}

/** Read the JSON Option<u64>; reject unknown status rather than trust it. */
export function isRevoked(value: unknown): boolean {
  if (value === null) return false;
  if (
    typeof value === "string" &&
    /^\d{1,20}$/.test(value) &&
    BigInt(value) <= 18446744073709551615n
  ) {
    return true;
  }
  throw new Error("Invalid or missing attestation revocation status");
}

// === Attestation info + mapping ===

export interface AttestationInfo {
  id: ObjectId;
  /** The inner type `T`, e.g. `0xAUD::audit::Audit`. The full object type is
   *  always `${registryPkg}::attestations::Attestation<${innerType}>`. */
  innerType: string;
  /** Whether the registry has set revoked_at_ms. */
  revoked: boolean;
  /** Server-rendered Display v2 fields. */
  display: Record<string, unknown>;
}

const ATTESTATION_RE = /^(0x[0-9a-fA-F]+)::attestations::Attestation<(.+)>$/;

/** Parse a registry attestation; return null for unrelated object types.
 *  Throw if its revocation status cannot be read. */
export function toAttestationInfo(
  object: SuiClientTypes.Object<{ display: true; json: true }>,
  registryPkg: SuiAddress,
): AttestationInfo | null {
  const m = object.type?.match(ATTESTATION_RE);
  if (!m || normalizeSuiAddress(m[1]!) !== normalizeSuiAddress(registryPkg)) {
    return null;
  }
  return {
    id: object.objectId,
    innerType: m[2]!,
    revoked: isRevoked(object.json?.revoked_at_ms),
    display: object.display?.output ?? {},
  };
}

/** The defining (origin) package id of an inner type string. */
export function innerTypePackage(innerType: string): SuiAddress {
  return normalizeSuiAddress(innerType.split("::")[0]!);
}

/** Whether `pkg` is a version of a trusted attester's package. `attestors` come
 *  from `useTrustedAttestors` (lineages resolved); an empty list — still resolving
 *  or none configured — yields false. */
export function isConfiguredAttestor(
  attestors: ResolvedAttestor[],
  pkg: SuiAddress,
): boolean {
  const id = normalizeSuiAddress(pkg);
  return attestors.some((a) => a.lineage.some((v) => normalizeSuiAddress(v) === id));
}

/** The trusted attester whose lineage defines `innerType`, if any. */
export function attestorFor(
  attestors: ResolvedAttestor[],
  innerType: string,
): ResolvedAttestor | undefined {
  const pkg = innerTypePackage(innerType);
  return attestors.find((a) => a.lineage.some((id) => normalizeSuiAddress(id) === pkg));
}
