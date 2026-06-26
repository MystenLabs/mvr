import { useEffect, useState } from "react";
import Link from "next/link";
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
import { type TrustedAttestor } from "@/lib/attestations";
import { CheckIcon } from "@/icons/single-package/CheckIcon";
import { WarningIcon } from "@/icons/single-package/WarningIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

/** Tab label: a pill with the count of live attestations. */
export function TrustSignalCount({
  address,
  network,
}: {
  address: string;
  network: "mainnet" | "testnet";
}) {
  const { data } = useGetAttestations(address, network);
  const positives = (data ?? []).length;

  // Attestations are a mainnet-only feature in the demo.
  if (network === "testnet" || !positives) return null;
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
  // id), so let the viewer pick which version's attestations to inspect.
  // Defaults to the resolved version; the selector only appears when the
  // package has more than one version.
  const { data: versions } = useGetMvrVersionAddresses(
    name.name,
    name.version,
    network,
  );
  const [selectedAddress, setSelectedAddress] = useState(name.package_address);
  // Re-sync to the resolved version when the page navigates to a different
  // package/version; picking a version in the dropdown changes selectedAddress
  // but not name.package_address, so it doesn't fight the user's selection.
  useEffect(() => {
    setSelectedAddress(name.package_address);
  }, [name.package_address]);
  const { data, isLoading, error } = useGetAttestations(selectedAddress, network);
  const { data: revokedData } = useGetRevokedAttestations(selectedAddress, network);
  const revoked = revokedData ?? [];

  const positives = data ?? [];
  const hasLiveAttestation = positives.length > 0;

  // Attestations are a mainnet-only feature in the demo.
  if (network === "testnet") return null;

  const versionList = versions ?? [];
  const selectedVersion =
    versionList.find((v) => v.address === selectedAddress)?.version ??
    name.version;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-sm">
        <Text as="div" kind="heading" size="heading-regular">
          <p>Security</p>
        </Text>
        {versionList.length > 1 && (
          <Select
            value={String(selectedVersion)}
            onValueChange={(val) => {
              const v = versionList.find((x) => String(x.version) === val);
              if (v) setSelectedAddress(v.address);
            }}
          >
            <SelectTrigger className="w-auto gap-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versionList.map((v) => (
                <SelectItem key={v.version} value={String(v.version)}>
                  Version {v.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading && (
        <LoadingState size="sm" title="" description="Loading attestations..." />
      )}

      {error && (
        <div className="flex items-start gap-sm rounded-md border border-stroke-secondary bg-bg-secondary p-md">
          <WarningIcon className="mt-2xs h-5 w-5 shrink-0 text-content-negative" />
          <Text as="p" kind="paragraph" size="paragraph-small">
            Couldn&apos;t load attestations: {error.message}
          </Text>
        </div>
      )}

      {!isLoading && !error && !hasLiveAttestation && (
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

/** One focused card per audit: a badge, the verdict headline (and score), the
 *  attester, and — demoted — the type and object link. Optimized for the common
 *  case of one audit per attester, so there is no per-attester sub-grouping. */
function AuditCard({ item }: { item: DisplayedAttestation }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";
  const { display, innerType, id } = item.info;
  const headline =
    str(display["description"]) ?? str(display["name"]) ?? "Attestation";
  const score = str(display["score"]);
  const link = httpsLink(display["link"]);

  return (
    <div className="flex gap-sm rounded-md bg-bg-secondary p-md">
      <AuditBadge item={item} />
      <div className="flex min-w-0 flex-1 flex-col gap-2xs">
        {/* Verdict — the line the eye should land on first. */}
        <div className="flex items-start justify-between gap-sm">
          <Text kind="label" size="label-regular">
            {headline}
          </Text>
          {score && <ScorePill>{score}</ScorePill>}
        </div>

        {/* Attester identity + report link. */}
        <Text as="div" kind="paragraph" size="paragraph-xs" className="text-content-secondary">
          by {item.attestor.mvrName ? (
            mvrLink(item.attestor.mvrName, item.attestor.name)
          ) : (
            <span>{item.attestor.name}</span>
          )}
          {link && <> · {reportLink(link)}</>}
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
  const src = httpsLink(item.info.display["image_url"]);
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

/** A small score pill (e.g. "95/100"), reusing the count-chip styling. */
function ScorePill({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 rounded-full bg-bg-quarternaryBleedthrough px-xs py-2xs">
      <Text kind="label" size="label-2xs">
        {children}
      </Text>
    </div>
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
function reportLink(url: string): React.ReactNode {
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
function httpsLink(v: unknown): string | undefined {
  const s = str(v);
  return s && s.startsWith("https://") ? s : undefined;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
