import { useState } from "react";
import Link from "next/link";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import {
  useGetAttestations,
  useGetRevokedAttestations,
  type AttributedAttestation,
  type DisplayedAttestation,
} from "@/hooks/useGetAttestations";
import { useGetMvrVersionAddresses } from "@/hooks/useGetMvrVersionAddresses";
import { Text } from "../ui/Text";
import LoadingState from "../LoadingState";
import ExplorerLink from "../ui/explorer-link";
import { CopyBtn } from "../ui/CopyBtn";
import { attestationConfig, type TrustedAttestor } from "@/lib/attestations";
import { CheckIcon } from "@/icons/single-package/CheckIcon";
import { WarningIcon } from "@/icons/single-package/WarningIcon";

/** Tab label: a pill with the count of live attestations on the latest version.
 *  Shown whenever attestations are configured — "✓ 0" is itself a signal (this
 *  package has no published audits), so it shows even at zero. */
export function TrustSignalCount({
  address,
  network,
}: {
  address: string;
  network: "mainnet" | "testnet";
}) {
  const { data } = useGetAttestations(address, network);
  const positives = (data ?? []).length;

  // Testnet-only for now (the registry is only deployed on testnet). Shown even
  // at 0 — "✓ 0" is itself a signal that the latest version has no published
  // audits.
  if (!attestationConfig(network)) return null;
  return (
    <div className="flex items-center gap-2xs">
      <CountPill
        icon={<CheckIcon className="h-3.5 w-3.5 text-content-positive" />}
        count={positives}
      />
    </div>
  );
}

/** A count pill: only the icon is colored; the number uses the default color
 *  to match the app's other count chips. */
function CountPill({ icon, count }: { icon: React.ReactNode; count: number }) {
  return (
    <div className="flex items-center gap-2xs rounded-full bg-bg-quarternaryBleedthrough px-xs py-2xs">
      {icon}
      <Text kind="label" size="label-2xs">
        {count}
      </Text>
    </div>
  );
}

export function SinglePackageTrustSignals({ name }: { name: ResolvedName }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";
  // Attestations are per package version (the subject is a version's package
  // id), and each version is audited — or not — independently. So we show every
  // version's status here at once rather than only the resolved version.
  const { data: versions } = useGetMvrVersionAddresses(
    name.name,
    name.version,
    network,
  );

  // Attestations are a testnet-only feature in the demo for now (the registry
  // is only deployed on testnet).
  if (!attestationConfig(network)) return null;

  // Attestations are keyed by the subject *address*, so versions published at the
  // same address (a system package like the bridge keeps one address across all
  // its upgrades) share a single box — collapse them to one section per distinct
  // address, keeping the newest version as its representative.
  const byAddress = new Map<string, NonNullable<typeof versions>[number]>();
  for (const v of versions ?? []) {
    const key = normalizeSuiAddress(v.address);
    const seen = byAddress.get(key);
    if (!seen || v.version > seen.version) byAddress.set(key, v);
  }
  const versionList = [...byAddress.values()].sort(
    (a, b) => b.version - a.version,
  ); // newest first
  const latestVersion = versionList.reduce(
    (max, v) => Math.max(max, v.version),
    name.version,
  );

  return (
    <div className="flex flex-col gap-lg">
      {/* Page heading is "Audits" for now; the "Security" tab will become an
          h1 over an "Audits" h2 once other trust signals are integrated. */}
      <Text as="div" kind="heading" size="heading-regular">
        <p>Audits</p>
      </Text>

      {versionList.length <= 1 ? (
        // Single-version package (the common case): no per-version headers.
        <VersionAudits address={name.package_address} network={network} />
      ) : (
        versionList.map((v, i) => (
          <div
            key={v.version}
            className={`flex flex-col gap-sm ${
              i > 0 ? "border-t border-stroke-secondary pt-md" : ""
            }`}
          >
            <div className="flex items-center gap-sm">
              <Text kind="label" size="label-regular">
                Version {v.version}
              </Text>
              {v.version === latestVersion && (
                <Text
                  as="span"
                  size="label-xs"
                  kind="label"
                  className="rounded-md bg-bg-accentBleedthrough3 px-sm py-xs"
                >
                  Latest
                </Text>
              )}
            </div>
            <VersionAudits address={v.address} network={network} />
          </div>
        ))
      )}
    </div>
  );
}

/** The attestation status of a single package version: live audits, the
 *  "no audits" warning, surfaced load errors, and any revoked attestations. */
function VersionAudits({
  address,
  network,
}: {
  address: string;
  network: "mainnet" | "testnet";
}) {
  const { data, isLoading, error } = useGetAttestations(address, network);
  const { data: revokedData, error: revokedError } = useGetRevokedAttestations(
    address,
    network,
  );
  const revoked = revokedData ?? [];
  const displayError = error ?? revokedError;
  const positives = data ?? [];
  const hasLiveAttestation = positives.length > 0;

  return (
    <div className="flex flex-col gap-sm">
      {isLoading && (
        <LoadingState size="sm" title="" description="Loading attestations..." />
      )}

      {displayError && (
        <div className="flex items-start gap-sm rounded-md border border-stroke-secondary bg-bg-secondary p-md">
          <WarningIcon className="mt-2xs h-5 w-5 shrink-0 text-content-negative" />
          <Text as="p" kind="paragraph" size="paragraph-small">
            Couldn&apos;t load attestations: {displayError.message}
          </Text>
        </div>
      )}

      {!isLoading && !displayError && !hasLiveAttestation && (
        <div className="flex items-start gap-sm rounded-md border border-stroke-secondary bg-bg-secondary p-md">
          <WarningIcon className="mt-2xs h-5 w-5 shrink-0 text-content-negative" />
          <Text as="p" kind="paragraph" size="paragraph-small">
            This package version has no published audits.
          </Text>
        </div>
      )}

      {positives.length > 0 && (
        <section className="flex flex-col gap-sm">
          {positives.map((item) => (
            <AuditCard key={item.info.id} item={item} />
          ))}
        </section>
      )}

      {revoked.length > 0 && <RevokedSummary items={revoked} />}
    </div>
  );
}

/** One focused card per audit: a badge, the verdict headline, the attester, and
 *  — demoted — the type and object link. Optimized for the common case of one
 *  audit per attester, so there is no per-attester sub-grouping. Only the
 *  standard presentation conventions (name/description/image_url/link) are
 *  surfaced; schema-specific Display fields are not — the platform stays
 *  agnostic to any one schema's custom fields. */
function AuditCard({ item }: { item: DisplayedAttestation }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";
  const { display, innerType, id } = item.info;
  const headline =
    str(display["description"]) ?? str(display["name"]) ?? "Attestation";
  const link = httpsLink(display["link"]);
  const hash = str(display["link_hash"]);

  return (
    <div className="flex gap-sm rounded-md bg-bg-secondary p-md">
      <AuditBadge item={item} />
      <div className="flex min-w-0 flex-1 flex-col gap-2xs">
        {/* Verdict — the line the eye should land on first. */}
        <Text kind="label" size="label-regular">
          {headline}
        </Text>

        {/* Attester identity + report link. */}
        <Text as="div" kind="paragraph" size="paragraph-xs" className="text-content-secondary">
          by {item.attestor.mvrName ? (
            mvrLink(item.attestor.mvrName, item.attestor.name)
          ) : (
            <span>{item.attestor.name}</span>
          )}
          {link && <> · {reportLink(link)}</>}
          {hash && <> · {reportHash(hash)}</>}
        </Text>

        {/* Developer metadata, de-emphasized at the end. */}
        <Text as="p" kind="paragraph" size="paragraph-xs" className="break-all text-content-tertiary">
          <span className="font-mono">{moduleAndType(innerType)}</span> ·{" "}
          {objectLink(id, network)}
        </Text>
      </div>
    </div>
  );
}

/** The audit's `image_url` as a badge, falling back to the attester avatar if
 *  it is absent or fails to load (so a broken/placeholder URL never shows a
 *  broken-image icon). */
function AuditBadge({ item }: { item: DisplayedAttestation }) {
  const [broken, setBroken] = useState(false);
  const src = imageSource(item.info.display["image_url"]);
  if (!src || broken) {
    return <AttesterAvatar attestor={item.attestor} />;
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setBroken(true)}
      />
    </span>
  );
}

/** Revoked attestations, minimized: on a package the viewer rarely cares about
 *  them, so they collapse to a small "N revoked" line that expands on demand. */
function RevokedSummary({ items }: { items: AttributedAttestation[] }) {
  return (
    <details className="border-t border-stroke-secondary pt-md">
      <summary className="cursor-pointer">
        <Text as="span" kind="paragraph" size="paragraph-xs" className="text-content-tertiary">
          {items.length} revoked
        </Text>
      </summary>
      <Text as="p" kind="paragraph" size="paragraph-xs" className="mt-xs text-content-tertiary">
        {items.map((it, i) => (
          <span key={it.info.id}>
            {i > 0 ? ", " : ""}
            {it.attestor.name} ({str(it.info.display["name"]) ?? "Attestation"})
          </span>
        ))}
      </Text>
    </details>
  );
}

export function AttesterAvatar({
  attestor,
  size = "md",
}: {
  attestor: TrustedAttestor;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-12 w-12" : "h-9 w-9";
  const base = `flex ${dim} shrink-0 items-center justify-center rounded-md overflow-hidden`;
  if (attestor.iconUrl) {
    return (
      <span className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attestor.iconUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span className={`${base} ${avatarColor(attestor.name)}`}>
      <Text
        kind="label"
        size={size === "sm" ? "label-2xs" : "label-small"}
        className="text-content-primaryInverse"
      >
        {initials(attestor.name)}
      </Text>
    </span>
  );
}

/** The attestation object id, truncated and linked to an explorer. */
function objectLink(id: string, network: "mainnet" | "testnet"): React.ReactNode {
  return (
    <ExplorerLink network={network} type="object" idOrHash={id}>
      {truncateId(id)}
    </ExplorerLink>
  );
}

/** The report/advisory URL as a link showing its host. */
export function reportLink(url: string): React.ReactNode {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-content-accent underline"
    >
      {hostOf(url)} ↗
    </a>
  );
}

/** The report digest (the `link_hash` convention, e.g. `sha256:…`) shown
 *  compactly, with a copy button carrying the full value so a viewer can check a
 *  downloaded report against it. Full value on hover. */
export function reportHash(value: string): React.ReactNode {
  return (
    <span className="inline-flex items-center gap-2xs align-middle">
      <span className="font-mono" title={value}>
        {truncateHash(value)}
      </span>
      <CopyBtn text={value} size="sm" />
    </span>
  );
}

/** `sha256:9f86d0…` from an `alg:hex` digest (or a bare-value fallback). */
function truncateHash(value: string): string {
  const i = value.indexOf(":");
  if (i < 0) return value.length > 16 ? `${value.slice(0, 12)}…` : value;
  return `${value.slice(0, i + 1)}${value.slice(i + 1, i + 9)}…`;
}

/** Render an MVR name as an internal link to its package page. */
function mvrLink(name: string, label?: string): React.ReactNode {
  return (
    <Link href={`/package/${name}`} className="text-content-accent underline">
      {label ?? name}
    </Link>
  );
}

const AVATAR_COLORS = ["bg-pastel-blue", "bg-pastel-green", "bg-pastel-purple", "bg-pastel-orange"];

/** Deterministic avatar background from the attester name. */
function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

/** Up to two uppercase initials from the attester name. */
function initials(name: string): string {
  const parts = name.split(/[\s_-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0]![0]! + parts[1]![0]! : name.slice(0, 2);
  return letters.toUpperCase();
}

function truncateId(id: string): string {
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

/** The `module::Type` part of an inner type, dropping the package address. */
function moduleAndType(innerType: string): string {
  const parts = innerType.split("::");
  return parts.length > 1 ? parts.slice(1).join("::") : innerType;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Only surface https links (basic hygiene; full host-allowlisting is M4). */
export function httpsLink(v: unknown): string | undefined {
  const s = str(v);
  return s && s.startsWith("https://") ? s : undefined;
}

/** An `image_url` value we'll put in an `<img src>`: an `https` URL, or an
 *  inline `data:image/svg+xml` URI (a badge a schema derives from the
 *  attestation's own data). Safe because it renders in an `<img>`, where a
 *  `<script>` or `onload` inside the SVG does not execute — the value must never
 *  be inlined into the DOM. Distinct from `httpsLink` (used for the report
 *  `link`), which stays https-only: a `data:` link target isn't wanted. Anything
 *  else — `http`, other `data:` types — is rejected. */
function imageSource(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (s.startsWith("https://")) return s;
  if (s.startsWith("data:image/svg+xml,") || s.startsWith("data:image/svg+xml;")) {
    return s;
  }
  return undefined;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
