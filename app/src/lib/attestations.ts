// Reading package attestations from the attestation registry. This is a pure
// chain read (no MVR backend): derive the per-subject Box address and list the
// `Attestation<T>` objects it owns, keeping only those from trusted attesters.
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

/** A trusted attester with its package lineage resolved from `originalId` (every
 *  version id — original publish + upgrades). An attestation is this attester's
 *  when its inner type's defining package is in `lineage` — the off-chain form of
 *  the on-chain `attester_of<T>() = type_name::original_id<T>()` rule, expanded to
 *  every version so a type added in an upgrade still matches. */
export interface ResolvedAttestor extends TrustedAttestor {
  lineage: SuiAddress[];
}

export interface AttestationConfig {
  /** attestations package id (the `Attestation<>` wrapper type). */
  registryPkg: SuiAddress;
  /** The shared Registry object id — parent for per-subject Box derivation. */
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

/** Every trusted attester across all networks, deduped by `originalId` — for the
 *  network-agnostic "trusted attestors" listing. */
export function allTrustedAttestors(): TrustedAttestor[] {
  const seen = new Set<string>();
  const out: TrustedAttestor[] = [];
  for (const cfg of Object.values(allConfigs())) {
    for (const a of cfg?.trustedAttestors ?? []) {
      const id = normalizeSuiAddress(a.originalId);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(a);
      }
    }
  }
  return out;
}

// === Box address ===

const BoxKey = bcs.struct("BoxKey", { subject: bcs.Address, revoked: bcs.bool() });

/** Derive a subject's box address, mirroring on-chain
 *  `derived_object::derive_address(registry, BoxKey { subject, revoked })`. */
function derivedBox(
  registryPkg: SuiAddress,
  registryId: ObjectId,
  subject: SuiAddress,
  revoked: boolean,
): ObjectId {
  const keyBytes = BoxKey.serialize({
    subject: normalizeSuiAddress(subject),
    revoked,
  }).toBytes();
  return deriveObjectID(
    registryId,
    `${registryPkg}::attestations::BoxKey`,
    keyBytes,
  );
}

/** Address of the subject's active `Box` (`revoked: false`). `revoke` moves an
 *  attestation to the sibling revoked box, so reading this address yields
 *  exactly the un-revoked set. */
export function boxAddress(
  registryPkg: SuiAddress,
  registryId: ObjectId,
  subject: SuiAddress,
): ObjectId {
  return derivedBox(registryPkg, registryId, subject, false);
}

/** Address of the subject's revoked `Box` (`revoked: true`) — where `revoke`
 *  moves attestations. Lets the read-by-type Issued tab tell a revoked
 *  attestation from a live one by its owner, since the object carries no
 *  status field. */
export function revokedBoxAddress(
  registryPkg: SuiAddress,
  registryId: ObjectId,
  subject: SuiAddress,
): ObjectId {
  return derivedBox(registryPkg, registryId, subject, true);
}

// === Attestation info + mapping ===

export interface AttestationInfo {
  id: ObjectId;
  /** The inner type `T`, e.g. `0xAUD::audit::Audit`. The full object type is
   *  always `${registryPkg}::attestations::Attestation<${innerType}>`. */
  innerType: string;
  /** Server-rendered Display v2 fields (all values are strings). */
  display: Record<string, unknown>;
}

const ATTESTATION_RE = /::attestations::Attestation<(.+)>$/;

/**
 * Map a `getOwnedObjects`/`getObject` response into `AttestationInfo`, or null
 * if it isn't a well-formed `Attestation<T>`. JSON-RPC nests Display fields
 * under `data.display.data`.
 */
export function toAttestationInfo(
  object: SuiClientTypes.Object<{ display: true }>,
): AttestationInfo | null {
  if (!object.type) return null;
  const m = object.type.match(ATTESTATION_RE);
  if (!m) return null;
  return {
    id: object.objectId,
    innerType: m[1]!,
    display: (object.display?.output ?? {}) as Record<string, unknown>,
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
