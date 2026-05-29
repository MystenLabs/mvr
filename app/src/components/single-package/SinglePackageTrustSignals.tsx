import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import {
  useGetAttestations,
  type DisplayedAttestation,
} from "@/hooks/useGetAttestations";
import { Text } from "../ui/Text";
import LoadingState from "../LoadingState";
import { isNegative, type TrustedAttestor } from "@/lib/attestations";

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
 *  effective negative ones (warning). Each shown only when non-zero. */
export function TrustSignalCount({
  address,
  network,
}: {
  address: string;
  network: "mainnet" | "testnet";
}) {
  const { data } = useGetAttestations(address, network);
  const effective = (data ?? []).filter((a) => a.effective);
  const positives = effective.filter((a) => !isNegative(a.info)).length;
  const negatives = effective.length - positives;

  if (!positives && !negatives) return null;
  return (
    <div className="flex items-center gap-2xs">
      {positives > 0 && (
        <CountPill
          icon={<CheckIcon className="h-3.5 w-3.5 text-content-positive" />}
          count={positives}
          tone="text-content-positive"
        />
      )}
      {negatives > 0 && (
        <CountPill
          icon={<WarningIcon className="h-3.5 w-3.5 text-content-warning" />}
          count={negatives}
          tone="text-content-warning"
        />
      )}
    </div>
  );
}

function CountPill({
  icon,
  count,
  tone,
}: {
  icon: React.ReactNode;
  count: number;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-2xs rounded-full bg-bg-quarternaryBleedthrough px-xs py-2xs">
      {icon}
      <Text kind="label" size="label-2xs" className={tone}>
        {count}
      </Text>
    </div>
  );
}

export function SinglePackageTrustSignals({ name }: { name: ResolvedName }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";
  const { data, isLoading } = useGetAttestations(name.package_address, network);

  const all = data ?? [];
  const negatives = all.filter((a) => isNegative(a.info));
  const positives = all.filter((a) => !isNegative(a.info));
  const activeVulns = negatives.filter((a) => a.effective).length;

  return (
    <div className="flex flex-col gap-lg">
      <Text as="div" kind="heading" size="heading-regular">
        <p>Trust Signals</p>
      </Text>

      {isLoading && (
        <LoadingState size="sm" title="" description="Loading attestations..." />
      )}

      {!isLoading && all.length === 0 && (
        <Text as="p" kind="paragraph" size="paragraph-small">
          No attestations from trusted attestors.
        </Text>
      )}

      {negatives.length > 0 && (
        <Section
          title="Vulnerabilities"
          icon={<WarningIcon className="h-4 w-4 shrink-0 text-content-warning" />}
          note={activeVulns > 0 ? `${activeVulns} active` : "none active"}
          noteTone={activeVulns > 0 ? "text-content-warning" : "text-content-tertiary"}
          groups={groupByAttestor(negatives)}
        />
      )}

      {positives.length > 0 && (
        <Section
          title="Audits"
          icon={<CheckIcon className="h-4 w-4 shrink-0 text-content-positive" />}
          groups={groupByAttestor(positives)}
        />
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  note,
  noteTone,
  groups,
}: {
  title: string;
  icon: React.ReactNode;
  note?: string;
  noteTone?: string;
  groups: AttestorGroup[];
}) {
  return (
    <section className="flex flex-col gap-sm">
      <div className="flex items-center gap-2xs">
        {icon}
        <Text kind="label" size="label-large">
          {title}
        </Text>
        {note && (
          <Text kind="label" size="label-xs" className={noteTone}>
            · {note}
          </Text>
        )}
      </div>
      {groups.map((g) => (
        <AttestorGroupCard key={g.attestor.originalId} group={g} />
      ))}
    </section>
  );
}

function AttestorGroupCard({ group }: { group: AttestorGroup }) {
  return (
    <div className="flex flex-col gap-sm rounded-md bg-bg-secondary p-md">
      <div className="flex items-center gap-sm">
        <AttesterAvatar attestor={group.attestor} />
        <div className="flex flex-col">
          <Text kind="label" size="label-regular">
            {group.attestor.name}
          </Text>
          <Text
            as="p"
            kind="paragraph"
            size="paragraph-xs"
            className="break-all font-mono opacity-60"
          >
            {group.attestor.originalId}
          </Text>
        </div>
      </div>
      {group.items.map((item) => (
        <AttestationRow key={item.info.id} item={item} />
      ))}
    </div>
  );
}

function AttesterAvatar({ attestor }: { attestor: TrustedAttestor }) {
  const base =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden";
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
      <Text kind="label" size="label-small" className="text-content-primaryInverse">
        {initials(attestor.name)}
      </Text>
    </span>
  );
}

function AttestationRow({ item }: { item: DisplayedAttestation }) {
  const { display, innerType } = item.info;
  const negative = isNegative(item.info);
  const title = str(display["name"]) ?? "Attestation";
  const description = str(display["description"]);
  const link = httpsLink(display["link"]);

  return (
    <div
      className={`flex flex-col gap-2xs rounded-sm border-l-2 py-sm pl-sm ${
        negative ? "border-stroke-negative bg-bg-negativeBleedthrough" : "border-stroke-accent"
      }`}
    >
      <div className="flex items-center justify-between gap-sm">
        <Text kind="label" size="label-small">
          {title}
        </Text>
        <StatusBadge item={item} negative={negative} />
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
        className="break-all font-mono opacity-60"
      >
        {innerType}
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

function StatusBadge({
  item,
  negative,
}: {
  item: DisplayedAttestation;
  negative: boolean;
}) {
  const revoked = item.info.display["active"] === "false";
  const label = revoked ? "Revoked" : item.effective ? "Active" : "Ineffective";
  // For an effective *negative* attestation, "active" is bad news → warning tone.
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

/** Up to two uppercase initials from the (often `snake_case`) attester name. */
function initials(name: string): string {
  const parts = name.split(/[\s_-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0]![0]! + parts[1]![0]! : name.slice(0, 2);
  return letters.toUpperCase();
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
