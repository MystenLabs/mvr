// Reading package attestations from the attestation registry. This is a pure
// chain read (no MVR backend): derive the per-subject Box address and list the
// `Attestation<T>` objects it owns, keeping only those from trusted attesters.
// See ATTESTATION-INTEGRATION.md.

import { bcs } from "@mysten/sui/bcs";
import { deriveObjectID, normalizeSuiAddress } from "@mysten/sui/utils";
import type { SuiObjectResponse } from "@mysten/sui/client";

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

const BoxKey = bcs.struct("BoxKey", { subject: bcs.Address, revoked: bcs.bool() });

/** Derive a subject's box address, mirroring on-chain
 *  `derived_object::derive_address(registry, BoxKey { subject, revoked })`. */
function derivedBox(
  registryPkg: string,
  registryId: string,
  subject: string,
  revoked: boolean,
): string {
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

/** Address of the per-subject active `Box` (`revoked: false`). `revoke` moves
 *  attestations out to the sibling revoked sink, so a read of this address
 *  yields exactly the un-revoked set. */
export function boxAddress(
  registryPkg: string,
  registryId: string,
  subject: string,
): string {
  return derivedBox(registryPkg, registryId, subject, false);
}

/** Address of the per-subject revoked sink (`revoked: true`) — where `revoke`
 *  moves attestations. Lets a read-by-type view (the Issued tab) tell a revoked
 *  attestation from a live one by its owner, since the object carries no status. */
export function revokedBoxAddress(
  registryPkg: string,
  registryId: string,
  subject: string,
): string {
  return derivedBox(registryPkg, registryId, subject, true);
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

/** A negative attestation (e.g. a vulnerability) per the `polarity` convention.
 *  Absence of the field defaults to positive. */
export function isNegative(att: AttestationInfo): boolean {
  return att.display["polarity"] === "negative";
}

/** The `severity` convention value (a CVSS base score 0–10), or null. */
export function readSeverity(att: AttestationInfo): number | null {
  const raw = att.display["severity"];
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

export interface SeverityBand {
  label: string;
  /** A CSS color (var) for the band, for inline styling. The `content`
   *  palette is text-only (no `border-content-*`), and Tailwind only scans
   *  `.tsx`, so a class built here wouldn't be generated — hence a raw var. */
  color: string;
}

/** Map a CVSS base score to its qualitative band (CVSS v3.1). */
export function severityBand(score: number): SeverityBand {
  if (score >= 9) return { label: "Critical", color: "var(--content-negative)" };
  if (score >= 7) return { label: "High", color: "var(--content-negative)" };
  if (score >= 4) return { label: "Medium", color: "var(--content-warning)" };
  if (score > 0) return { label: "Low", color: "var(--content-tertiary)" };
  return { label: "None", color: "var(--content-tertiary)" };
}

/** Whether `pkg` is a configured trusted attester (any lineage version).
 *  A pure in-memory check — used to gate the "Issued" tab without any RPC. */
export function isConfiguredAttestor(cfg: AttestationConfig, pkg: string): boolean {
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

// === Conventions (effectiveness) — ported from the attestation-registry repo's
// ts/src/conventions.ts. Operates purely on Display fields. Revocation is no
// longer a convention: a revoked attestation is moved out of the active Box
// (the address `boxAddress` reads), so anything fetched from there is, by
// construction, un-revoked. ===

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

/**
 * An attestation is effective iff its `expires_at` Display field (if present)
 * is still in the future. Revocation is handled upstream by box membership.
 */
export function isEffective(
  att: AttestationInfo,
  now: () => number = Date.now,
): boolean {
  const expiresAt = readExpiresAt(att);
  return expiresAt === null || now() < expiresAt;
}
