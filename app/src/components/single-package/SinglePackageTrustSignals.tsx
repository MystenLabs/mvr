import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import {
  useGetAttestations,
  useGetRevokedAttestations,
  type AttributedAttestation,
  type DisplayedAttestation,
} from "@/hooks/useGetAttestations";
import { Text } from "../ui/Text";
import LoadingState from "../LoadingState";
import ExplorerLink from "../ui/explorer-link";
import { type TrustedAttestor } from "@/lib/attestations";
import { CheckIcon } from "@/icons/single-package/CheckIcon";
import { WarningIcon } from "@/icons/single-package/WarningIcon";

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
  const { data, isLoading } = useGetAttestations(name.package_address, network);
  const { data: revokedData } = useGetRevokedAttestations(name.package_address, network);
  const revoked = revokedData ?? [];

  const positives = data ?? [];
  const hasLiveAttestation = positives.length > 0;

  // Attestations are a mainnet-only feature in the demo.
  if (network === "testnet") return null;

  return (
    <div className="flex flex-col gap-lg">
      <Text as="div" kind="heading" size="heading-regular">
        <p>Security</p>
      </Text>

      {isLoading && (
        <LoadingState size="sm" title="" description="Loading attestations..." />
      )}

      {!isLoading && !hasLiveAttestation && (
        <div className="flex items-start gap-sm rounded-md border border-stroke-secondary bg-bg-secondary p-md">
          <WarningIcon className="mt-2xs h-5 w-5 shrink-0 text-content-negative" />
          <Text as="p" kind="paragraph" size="paragraph-small">
            This package has no active attestations published on MVR — it may
            not have been audited.
          </Text>
        </div>
      )}

      {positives.length > 0 && <AuditsSection items={positives} />}

      {revoked.length > 0 && (
        <div className="border-t border-stroke-secondary pt-md">
          <InactiveList label="Revoked" items={revoked} />
        </div>
      )}
    </div>
  );
}

/** Audits (positive attestations), grouped by attester. */
function AuditsSection({ items }: { items: DisplayedAttestation[] }) {
  const groups = groupByAttestor(items);
  return (
    <section className="flex flex-col gap-sm">
      <div className="flex items-center gap-2xs">
        <CheckIcon className="h-4 w-4 shrink-0 text-content-positive" />
        <Text kind="heading" size="heading-xs">
          Audits
        </Text>
      </div>
      {groups.map((g) => (
        <AttestorGroupCard key={g.attestor.originalId} group={g} />
      ))}
    </section>
  );
}

/** Effective attestations from one trusted attester. */
function AttestorGroupCard({ group }: { group: AttestorGroup }) {
  return (
    <div className="flex flex-col gap-sm rounded-md bg-bg-secondary p-md">
      <div className="flex items-center gap-sm">
        <AttesterAvatar attestor={group.attestor} />
        <div className="flex flex-col">
          <Text kind="label" size="label-regular">
            {group.attestor.name}
          </Text>
          {group.attestor.mvrName ? (
            <Text as="p" kind="paragraph" size="paragraph-xs">
              {mvrLink(group.attestor.mvrName)}
            </Text>
          ) : (
            <Text as="p" kind="paragraph" size="paragraph-xs" className="font-mono opacity-60">
              {truncateId(group.attestor.originalId)}
            </Text>
          )}
        </div>
      </div>
      {group.items.map((item) => (
        <AttestationRow key={item.info.id} item={item} />
      ))}
    </div>
  );
}

/** A compact, de-emphasized list — `label` is "Revoked". Items are attributed
 *  attestations. */
function InactiveList({
  label,
  items,
}: {
  label: string;
  items: AttributedAttestation[];
}) {
  return (
    <Text as="p" kind="paragraph" size="paragraph-xs" className="text-content-tertiary">
      {label}:{" "}
      {items.map((it, i) => (
        <span key={it.info.id}>
          {i > 0 ? ", " : ""}
          {it.attestor.name} ({str(it.info.display["name"]) ?? "Attestation"})
        </span>
      ))}
    </Text>
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

/** A positive attestation row (audits). */
function AttestationRow({ item }: { item: DisplayedAttestation }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";
  const { display, innerType, id } = item.info;
  const headline = str(display["description"]) ?? str(display["name"]) ?? "Attestation";
  const link = httpsLink(display["link"]);

  return (
    <div className="flex flex-col gap-2xs rounded-sm border-l-2 border-stroke-accent py-sm pl-sm">
      <Text kind="label" size="label-small">
        {headline}
        {link && <> ({reportLink(link)})</>}
      </Text>
      <Text as="p" kind="paragraph" size="paragraph-xs" className="break-all opacity-60">
        <span className="font-mono">{moduleAndType(innerType)}</span> (
        {objectLink(id, network)})
      </Text>
    </div>
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

/** Link to a dependency's MVR page by name, or show its id when unresolved
 *  (the package route resolves by name, so a raw id isn't linkable). */
/** Render an MVR name as a link to its package page. */
function mvrLink(name: string): React.ReactNode {
  return (
    <a href={`/package/${name}`} className="text-content-accent underline">
      {name}
    </a>
  );
}

interface AttestorGroup {
  attestor: TrustedAttestor;
  items: DisplayedAttestation[];
}

/** Group attestations by their trusted attester, preserving discovery order. */
function groupByAttestor(items: DisplayedAttestation[]): AttestorGroup[] {
  const groups: AttestorGroup[] = [];
  for (const item of items) {
    let group = groups.find(
      (g) => g.attestor.originalId === item.attestor.originalId,
    );
    if (!group) {
      group = { attestor: item.attestor, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
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

/** CVSS score for sorting; unscored attestations sort last. */
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
