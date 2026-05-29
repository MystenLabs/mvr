import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import {
  useGetAttestations,
  useInheritedVulns,
  type DisplayedAttestation,
  type InheritedVuln,
} from "@/hooks/useGetAttestations";
import { Text } from "../ui/Text";
import LoadingState from "../LoadingState";
import {
  isNegative,
  readSeverity,
  severityBand,
  type TrustedAttestor,
} from "@/lib/attestations";

/** A triangle-exclamation glyph; color comes from the text color (currentColor). */
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/** A check glyph; color comes from the text color (currentColor). */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Tab label: two pills — effective positive attestations (check) and
 *  effective negative ones (warning, incl. inherited). Each shown if non-zero. */
export function TrustSignalCount({
  address,
  network,
}: {
  address: string;
  network: "mainnet" | "testnet";
}) {
  const { data } = useGetAttestations(address, network);
  const { data: inherited } = useInheritedVulns(address, network);
  const effective = (data ?? []).filter((a) => a.effective);
  const positives = effective.filter((a) => !isNegative(a.info)).length;

  // Vulnerability scores (own effective negatives + inherited); the warning
  // pill is colored by the most severe one.
  const vulnScores = effective
    .filter((a) => isNegative(a.info))
    .map((a) => readSeverity(a.info) ?? 0)
    .concat((inherited ?? []).map((v) => readSeverity(v.attestation.info) ?? 0));
  const warnTone = severityBand(vulnScores.length ? Math.max(...vulnScores) : 0).tone;

  if (!positives && !vulnScores.length) return null;
  return (
    <div className="flex items-center gap-2xs">
      {positives > 0 && (
        <CountPill
          icon={<CheckIcon className="h-3.5 w-3.5 text-content-positive" />}
          count={positives}
        />
      )}
      {vulnScores.length > 0 && (
        <CountPill
          icon={<WarningIcon className={`h-3.5 w-3.5 ${warnTone}`} />}
          count={vulnScores.length}
        />
      )}
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
  const { data: inheritedData } = useInheritedVulns(name.package_address, network);
  const inherited = inheritedData ?? [];

  const all = data ?? [];
  const negatives = all.filter((a) => isNegative(a.info));
  const positives = all.filter((a) => !isNegative(a.info));
  const hasVulnSection = negatives.length > 0 || inherited.length > 0;

  return (
    <div className="flex flex-col gap-lg">
      <Text as="div" kind="heading" size="heading-regular">
        <p>Security</p>
      </Text>

      {isLoading && (
        <LoadingState size="sm" title="" description="Loading attestations..." />
      )}

      {!isLoading && all.length === 0 && inherited.length === 0 && (
        <Text as="p" kind="paragraph" size="paragraph-small">
          No attestations from trusted attestors.
        </Text>
      )}

      {hasVulnSection && (
        <VulnerabilitiesSection own={negatives} inherited={inherited} />
      )}

      {positives.length > 0 && <AuditsSection items={positives} />}
    </div>
  );
}

/** A single vulnerability to render — own or inherited from a dependency. */
interface VulnEntry {
  attestation: DisplayedAttestation;
  /** Set when the vulnerability is inherited from a dependency. */
  via?: { id: string; name?: string };
}

/** All vulnerabilities (own + inherited) in one severity-sorted list. */
function VulnerabilitiesSection({
  own,
  inherited,
}: {
  own: DisplayedAttestation[];
  inherited: InheritedVuln[];
}) {
  const ineffective = own.filter((a) => !a.effective);
  const entries: VulnEntry[] = [
    ...own.filter((a) => a.effective).map((a) => ({ attestation: a })),
    ...inherited.map((v) => ({
      attestation: v.attestation,
      via: { id: v.viaPackageId, name: v.viaName },
    })),
  ].sort((a, b) => severityOf(b.attestation.info) - severityOf(a.attestation.info));

  // Header is colored and summarized by the active vulnerabilities' severities.
  const scores = entries.map((e) => readSeverity(e.attestation.info) ?? 0);
  const maxTone = severityBand(scores.length ? Math.max(...scores) : 0).tone;

  return (
    <section className="flex flex-col gap-sm">
      <div className="flex items-center gap-2xs">
        <WarningIcon className={`h-4 w-4 shrink-0 ${maxTone}`} />
        <Text kind="heading" size="heading-xs">
          Vulnerabilities
        </Text>
        <Text
          kind="label"
          size="label-xs"
          className={scores.length ? maxTone : "text-content-tertiary"}
        >
          · {scores.length ? severityBreakdown(scores) : "none active"}
        </Text>
      </div>
      {entries.map((e) => (
        <VulnRow key={e.attestation.info.id} entry={e} />
      ))}
      {ineffective.length > 0 && <InactiveList items={ineffective} />}
    </section>
  );
}

/** Summarize scores by band, e.g. "1 high, 1 medium" (most severe first). */
function severityBreakdown(scores: number[]): string {
  const order = ["Critical", "High", "Medium", "Low", "None"];
  const counts: Record<string, number> = {};
  for (const s of scores) {
    const band = severityBand(s).label;
    counts[band] = (counts[band] ?? 0) + 1;
  }
  return order
    .filter((b) => counts[b])
    .map((b) => `${counts[b]} ${b.toLowerCase()}`)
    .join(", ");
}

function VulnRow({ entry }: { entry: VulnEntry }) {
  const { attestation, via } = entry;
  const { display, innerType } = attestation.info;
  const title = str(display["name"]) ?? "Vulnerability";
  const description = str(display["description"]);
  const link = httpsLink(display["link"]);
  const severity = readSeverity(attestation.info);

  return (
    <div className="flex flex-col gap-2xs rounded-md border-l-2 border-stroke-negative bg-bg-negativeBleedthrough p-md">
      <div className="flex items-center justify-between gap-sm">
        <Text kind="label" size="label-small">
          {title}
        </Text>
        <div className="flex items-center gap-sm">
          {severity !== null && <SeverityChip score={severity} />}
          <StatusBadge item={attestation} negative />
        </div>
      </div>
      {description && (
        <Text as="p" kind="paragraph" size="paragraph-small">
          {description}
        </Text>
      )}
      <div className="flex items-center gap-2xs break-all text-content-tertiary">
        <AttesterAvatar attestor={attestation.attestor} size="sm" />
        <Text as="span" kind="paragraph" size="paragraph-xs">
          {attestation.attestor.mvrName ? (
            <>
              {mvrLink(attestation.attestor.mvrName)}
              {`::${moduleAndType(innerType)}`}
            </>
          ) : (
            <span className="font-mono">{innerType}</span>
          )}
          {via && (
            <>
              {" · in dependency "}
              <DepLink id={via.id} name={via.name} />
            </>
          )}
        </Text>
      </div>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-content-accent">
          <Text as="span" kind="paragraph" size="paragraph-xs">
            {hostOf(link)} ↗
          </Text>
        </a>
      )}
    </div>
  );
}

/** Audits (positive attestations), grouped by attester. */
function AuditsSection({ items }: { items: DisplayedAttestation[] }) {
  const ineffective = items.filter((a) => !a.effective);
  const groups = groupByAttestor(items.filter((a) => a.effective));
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
      {ineffective.length > 0 && <InactiveList items={ineffective} />}
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

/** A compact, de-emphasized list of ineffective (revoked/superseded) ones. */
function InactiveList({ items }: { items: DisplayedAttestation[] }) {
  return (
    <Text as="p" kind="paragraph" size="paragraph-xs" className="text-content-tertiary">
      Inactive:{" "}
      {items.map((it, i) => (
        <span key={it.info.id}>
          {i > 0 ? ", " : ""}
          {it.attestor.name} ({str(it.info.display["name"]) ?? "Attestation"})
        </span>
      ))}
    </Text>
  );
}

function AttesterAvatar({
  attestor,
  size = "md",
}: {
  attestor: TrustedAttestor;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-5 w-5" : "h-9 w-9";
  const base = `flex ${dim} shrink-0 items-center justify-center rounded-full overflow-hidden`;
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
  const { display, innerType } = item.info;
  const title = str(display["name"]) ?? "Attestation";
  const description = str(display["description"]);
  const link = httpsLink(display["link"]);

  return (
    <div className="flex flex-col gap-2xs rounded-sm border-l-2 border-stroke-accent py-sm pl-sm">
      <div className="flex items-center justify-between gap-sm">
        <Text kind="label" size="label-small">
          {title}
        </Text>
        <StatusBadge item={item} negative={false} />
      </div>
      {description && (
        <Text as="p" kind="paragraph" size="paragraph-small">
          {description}
        </Text>
      )}
      <Text
        as="p"
        kind="paragraph"
        size="paragraph-xs"
        className="break-all font-mono opacity-50"
      >
        {moduleAndType(innerType)}
      </Text>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-content-accent">
          <Text as="span" kind="paragraph" size="paragraph-xs">
            {hostOf(link)} ↗
          </Text>
        </a>
      )}
    </div>
  );
}

function SeverityChip({ score }: { score: number }) {
  const band = severityBand(score);
  return (
    <Text as="span" kind="label" size="label-2xs" className={band.tone}>
      {band.label} ({score.toFixed(1)})
    </Text>
  );
}

function StatusBadge({
  item,
  negative,
}: {
  item: DisplayedAttestation;
  negative: boolean;
}) {
  const revoked = item.info.display["active"] === "false";
  const label = revoked ? "Revoked" : item.effective ? "Active" : "Ineffective";
  const tone = !item.effective
    ? "text-content-tertiary"
    : negative
      ? "text-content-warning"
      : "text-content-positive";
  return (
    <Text as="span" kind="label" size="label-2xs" className={tone}>
      {label}
    </Text>
  );
}

/** Link to a dependency's MVR page by name, or show its id when unresolved
 *  (the package route resolves by name, so a raw id isn't linkable). */
function DepLink({ id, name }: { id: string; name?: string }) {
  if (name) {
    return (
      <a href={`/package/${name}`} className="text-content-accent underline">
        {name}
      </a>
    );
  }
  return <span className="font-mono">{truncateId(id)}</span>;
}

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
function severityOf(info: DisplayedAttestation["info"]): number {
  return readSeverity(info) ?? -1;
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
