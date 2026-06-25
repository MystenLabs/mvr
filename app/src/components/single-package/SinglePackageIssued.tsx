import { useState } from "react";
import Link from "next/link";
import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import {
  useIssuedAttestations,
  type IssuedAttestation,
} from "@/hooks/useGetAttestations";
import { useReverseResolution } from "@/hooks/useReverseResolution";
import { Text } from "../ui/Text";
import LoadingState from "../LoadingState";
import { WarningIcon } from "@/icons/single-package/WarningIcon";

const PAGE_SIZE = 20;

/** Tab label: count of attestations this package has issued. */
export function IssuedCount({
  address,
  network,
}: {
  address: string;
  network: "mainnet" | "testnet";
}) {
  const { data } = useIssuedAttestations(address, network);
  const count = (data ?? []).length;
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
  const { data, isLoading, error } = useIssuedAttestations(name.package_address, network);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const issued = data ?? [];
  // Newest first; attestations without a publish_date sort last.
  const sorted = [...issued].sort((a, b) => publishMs(b) - publishMs(a));
  const visible = sorted.slice(0, visibleCount);

  // Resolve names only for the subjects currently on screen, so the lookup
  // fan-out grows with what's shown rather than the whole (possibly large) list.
  const visibleSubjects = [...new Set(visible.map((i) => i.subject))];
  const { items: names } = useReverseResolution(visibleSubjects, network);
  const nameOf = (subject: string) => (names[subject] as { name?: string })?.name;

  // Attestations are a mainnet-only feature in the demo.
  if (network === "testnet") return null;

  const subjectCount = new Set(issued.map((i) => i.subject)).size;
  const revokedCount = issued.filter((i) => i.revoked).length;
  const activeCount = issued.length - revokedCount;

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
            {subjectCount} package{subjectCount === 1 ? "" : "s"} · {activeCount}{" "}
            active
            {revokedCount > 0 && <> · {revokedCount} revoked</>}
          </Text>
        )}
      </div>

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

      {!isLoading && !error && issued.length === 0 && (
        <Text as="p" kind="paragraph" size="paragraph-small">
          This package hasn&apos;t issued any attestations.
        </Text>
      )}

      {visible.length > 0 && (
        <div className="flex flex-col divide-y divide-stroke-secondary">
          {visible.map((item) => (
            <IssuedRow key={item.info.id} item={item} name={nameOf(item.subject)} />
          ))}
        </div>
      )}

      {visibleCount < sorted.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="self-start"
        >
          <Text kind="label" size="label-small" className="text-content-accent underline">
            Show more ({sorted.length - visibleCount})
          </Text>
        </button>
      )}
    </div>
  );
}

/** One dense row: the subject (linked), the attestation kind, its date, and a
 *  revoked tag. Revoked rows stay visible — on an attester you want to see how
 *  many they pull — but are de-emphasized. */
function IssuedRow({ item, name }: { item: IssuedAttestation; name?: string }) {
  const { display, innerType } = item.info;
  const date = formatDate(display["publish_date"]);

  return (
    <div
      className="flex items-center justify-between gap-sm py-sm"
      style={{ opacity: item.revoked ? 0.55 : 1 }}
    >
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
        {item.revoked && (
          <span className="shrink-0 rounded-full bg-bg-quarternaryBleedthrough px-xs py-2xs">
            <Text kind="label" size="label-2xs" className="text-content-tertiary">
              revoked
            </Text>
          </span>
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

/** Epoch ms of an attestation's publish_date, or -Infinity when absent (so it
 *  sorts to the end of a newest-first list). */
function publishMs(item: IssuedAttestation): number {
  const s = str(item.info.display["publish_date"]);
  const t = s ? Date.parse(s) : NaN;
  return Number.isNaN(t) ? -Infinity : t;
}

/** A publish_date rendered as a short date, or "" when absent/unparseable. */
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
