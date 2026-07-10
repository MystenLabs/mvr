import Link from "next/link";
import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import {
  useIssuedAttestations,
  type IssuedAttestation,
} from "@/hooks/useGetAttestations";
import { useReverseResolution } from "@/hooks/useReverseResolution";
import { attestationConfig, isConfiguredAttestor } from "@/lib/attestations";
import { Text } from "../ui/Text";
import LoadingState from "../LoadingState";
import { WarningIcon } from "@/icons/single-package/WarningIcon";

/** Tab label: count of attestations this package has issued. */
export function IssuedCount({
  name,
  network,
}: {
  name: ResolvedName;
  network: "mainnet" | "testnet";
}) {
  const { data } = useIssuedAttestations(name, network);
  const count = data?.items.length ?? 0;
  // Attestations are a mainnet-only feature in the demo.
  if (network === "testnet" || !count) return null;
  return (
    <div className="rounded-full bg-bg-quarternaryBleedthrough px-xs py-2xs">
      <Text kind="label" size="label-2xs">
        {count}
      </Text>
    </div>
  );
}

export function SinglePackageIssued({ name }: { name: ResolvedName }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";
  const { data, isLoading, error } = useIssuedAttestations(name, network);
  // The nav lists this tab only for configured attesters, but it's reachable by
  // URL for any package — warn when this package isn't a trusted attester.
  const cfg = attestationConfig();
  const trusted = !!cfg && isConfiguredAttestor(cfg, name.package_address);
  const issued = data?.items ?? [];
  const failures = data?.failures ?? 0;

  // Newest first; attestations without a published_at sort last. Live and
  // revoked are split into separate sections (revoked moved out of the main
  // list) so endorsements read distinctly from withdrawn ones. The fetch pages
  // through every result, so we render them all — no cap.
  const byDate = (a: IssuedAttestation, b: IssuedAttestation) => publishMs(b) - publishMs(a);
  const liveItems = issued.filter((i) => !i.revoked).sort(byDate);
  const revokedItems = issued.filter((i) => i.revoked).sort(byDate);

  // Resolve subject names for every attestation shown.
  const subjects = [...new Set(issued.map((i) => i.subject))];
  const { items: names } = useReverseResolution(subjects, network);
  const nameOf = (subject: string) => (names[subject] as { name?: string })?.name;

  // Attestations are a mainnet-only feature in the demo.
  if (network === "testnet") return null;

  const subjectCount = new Set(issued.map((i) => i.subject)).size;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <Text as="div" kind="heading" size="heading-regular">
          <p>Issued attestations</p>
        </Text>
        <Text
          as="p"
          kind="paragraph"
          size="paragraph-small"
          className="text-content-secondary"
        >
          On-chain claims this package has signed about other packages. Each one
          also appears on the subject package&apos;s Security tab.
        </Text>
        {issued.length > 0 && (
          <Text
            as="p"
            kind="label"
            size="label-small"
            className="text-content-tertiary"
          >
            {issued.length} attestation{issued.length === 1 ? "" : "s"} about{" "}
            {subjectCount} package{subjectCount === 1 ? "" : "s"} · {liveItems.length}{" "}
            active
            {revokedItems.length > 0 && <> · {revokedItems.length} revoked</>}
          </Text>
        )}
      </div>

      {!trusted && (
        <div className="flex items-start gap-sm rounded-md border border-stroke-secondary bg-bg-secondary p-md">
          <WarningIcon className="mt-2xs h-5 w-5 shrink-0 text-content-negative" />
          <Text as="p" kind="paragraph" size="paragraph-small">
            <span className="font-semibold text-content-negative">
              This attester isn&apos;t on mvr&apos;s trusted list.
            </span>{" "}
            These are on-chain claims this package has signed — not endorsements.
            Anyone can publish a package and issue attestations; verify the
            attester&apos;s identity before relying on them.
          </Text>
        </div>
      )}

      {isLoading && (
        <LoadingState size="sm" title="" description="Loading issued attestations..." />
      )}

      {error && (
        <div className="flex items-start gap-sm rounded-md border border-stroke-secondary bg-bg-secondary p-md">
          <WarningIcon className="mt-2xs h-5 w-5 shrink-0 text-content-negative" />
          <Text as="p" kind="paragraph" size="paragraph-small">
            Couldn&apos;t load issued attestations: {error.message}
          </Text>
        </div>
      )}

      {failures > 0 && (
        <div className="flex items-center gap-xs">
          <WarningIcon className="h-4 w-4 shrink-0 text-content-negative" />
          <Text as="span" kind="paragraph" size="paragraph-xs" className="text-content-tertiary">
            {failures} attestation{failures === 1 ? "" : "s"} couldn&apos;t be loaded.
          </Text>
        </div>
      )}

      {!isLoading && !error && issued.length === 0 && (
        <Text as="p" kind="paragraph" size="paragraph-small">
          This package hasn&apos;t issued any attestations.
        </Text>
      )}

      {liveItems.length > 0 && <RowList items={liveItems} nameOf={nameOf} />}

      {revokedItems.length > 0 && (
        <div className="flex flex-col gap-sm border-t border-stroke-secondary pt-md">
          <Text as="div" kind="label" size="label-regular" className="text-content-tertiary">
            <p>Revoked</p>
          </Text>
          <RowList items={revokedItems} nameOf={nameOf} deemphasized />
        </div>
      )}
    </div>
  );
}

/** A dense list of issued-attestation rows. */
function RowList({
  items,
  nameOf,
  deemphasized,
}: {
  items: IssuedAttestation[];
  nameOf: (subject: string) => string | undefined;
  deemphasized?: boolean;
}) {
  return (
    <div className="flex flex-col divide-y divide-stroke-secondary">
      {items.map((item) => (
        <IssuedRow
          key={item.info.id}
          item={item}
          name={nameOf(item.subject)}
          deemphasized={deemphasized}
        />
      ))}
    </div>
  );
}

/** One dense row: the subject (linked) + the attestation's description, with the
 *  `module::Type` and date as secondary metadata. Revoked rows live in their own
 *  section and are de-emphasized. */
function IssuedRow({
  item,
  name,
  deemphasized,
}: {
  item: IssuedAttestation;
  name?: string;
  deemphasized?: boolean;
}) {
  const { display, innerType } = item.info;
  const date = formatDate(display["published_at"]);
  const description = str(display["description"]) ?? str(display["name"]);

  return (
    <div
      className="flex items-start justify-between gap-sm py-sm"
      style={{ opacity: deemphasized ? 0.55 : 1 }}
    >
      <div className="flex min-w-0 flex-col gap-2xs">
        <div className="flex min-w-0 items-center gap-sm">
          <Text kind="label" size="label-small" className="truncate">
            <SubjectLink id={item.subject} name={name} />
          </Text>
          <Text
            as="span"
            kind="paragraph"
            size="paragraph-xs"
            className="shrink-0 font-mono text-content-tertiary"
          >
            {moduleAndType(innerType)}
          </Text>
        </div>
        {description && (
          <Text
            as="p"
            kind="paragraph"
            size="paragraph-small"
            className="truncate text-content-secondary"
          >
            {description}
          </Text>
        )}
      </div>
      {date && (
        <Text
          as="span"
          kind="paragraph"
          size="paragraph-xs"
          className="shrink-0 text-content-tertiary"
        >
          {date}
        </Text>
      )}
    </div>
  );
}

/** Link a subject (attested package) to its MVR page by name, or show its id. */
function SubjectLink({ id, name }: { id: string; name?: string }) {
  if (name) {
    return (
      <Link href={`/package/${name}`} className="text-content-accent underline">
        {name}
      </Link>
    );
  }
  return (
    <span className="font-mono">
      {id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id}
    </span>
  );
}

/** Epoch ms of an attestation's published_at, or -Infinity when absent (so it
 *  sorts to the end of a newest-first list). */
function publishMs(item: IssuedAttestation): number {
  const s = str(item.info.display["published_at"]);
  const t = s ? Date.parse(s) : NaN;
  return Number.isNaN(t) ? -Infinity : t;
}

/** A published_at rendered as a short date, or "" when absent/unparseable. */
function formatDate(v: unknown): string {
  const s = str(v);
  if (!s) return "";
  const t = Date.parse(s);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** The `module::Type` part of an inner type, dropping the package address. */
function moduleAndType(innerType: string): string {
  const parts = innerType.split("::");
  return parts.length > 1 ? parts.slice(1).join("::") : innerType;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
