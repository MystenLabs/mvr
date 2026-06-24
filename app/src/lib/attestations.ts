// Reading package attestations from the attestation registry. This is a pure
// chain read (no MVR backend): derive the per-subject Box address and list the
// `Attestation<T>` objects it owns, keeping only those from trusted attesters.
// See ATTESTATION-INTEGRATION.md.

import { bcs } from "@mysten/sui/bcs";
import { deriveObjectID, normalizeSuiAddress } from "@mysten/sui/utils";
import type { SuiObjectResponse } from "@mysten/sui/client";

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
  /** Original publish id of the attester package — the trust anchor. */
  originalId: SuiAddress;
  /** Every package-version id in the attester's lineage (original publish +
   *  upgrades). An attestation is trusted when its inner type's defining
   *  package is in this set — the off-chain equivalent of the on-chain
   *  `attester_of` rule. */
  lineage: SuiAddress[];
}

export interface AttestationConfig {
  /** attestation_registry package id (the `Attestation<>` wrapper type). */
  registryPkg: SuiAddress;
  /** The shared Registry object id — parent for per-subject Box derivation. */
  registryId: ObjectId;
  trustedAttestors: TrustedAttestor[];
}

/**
 * Curated trusted attesters for production, sourced from code — like the network
 * endpoints in `client-provider.tsx`, not the environment. Empty for now, so the
 * feature stays dormant until attesters are onboarded here. The demo overrides
 * this via `NEXT_PUBLIC_ATTESTATION_CONFIG` (written by `write-demo-env.sh`), the
 * same way `NEXT_PUBLIC_LOCAL_*` overrides the endpoints.
 */
const CHECKED_IN_CONFIG: AttestationConfig = {
  registryPkg: "",
  registryId: "",
  trustedAttestors: [],
};

let cached: AttestationConfig | null | undefined;

/**
 * The attestation config: the `NEXT_PUBLIC_ATTESTATION_CONFIG` env override (the
 * demo) if set, else the checked-in production config — or null while that has no
 * attesters (the feature is dormant).
 */
export function attestationConfig(): AttestationConfig | null {
  if (cached === undefined) {
    const raw = process.env.NEXT_PUBLIC_ATTESTATION_CONFIG;
    cached = raw
      ? (JSON.parse(raw) as AttestationConfig)
      : CHECKED_IN_CONFIG.trustedAttestors.length > 0
        ? CHECKED_IN_CONFIG
        : null;
  }
  return cached;
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
    `${registryPkg}::attestation_registry::BoxKey`,
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
   *  always `${registryPkg}::attestation_registry::Attestation<${innerType}>`. */
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
    innerType: m[1]!,
    display: (d.display?.data ?? {}) as Record<string, unknown>,
  };
}

/** The defining (origin) package id of an inner type string. */
export function innerTypePackage(innerType: string): SuiAddress {
  return normalizeSuiAddress(innerType.split("::")[0]!);
}

/** Whether `pkg` is a configured trusted attester (any lineage version).
 *  A pure in-memory check — used to gate the "Issued" tab without any RPC. */
export function isConfiguredAttestor(cfg: AttestationConfig, pkg: SuiAddress): boolean {
  const id = normalizeSuiAddress(pkg);
  return cfg.trustedAttestors.some((a) =>
    a.lineage.some((v) => normalizeSuiAddress(v) === id),
  );
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
