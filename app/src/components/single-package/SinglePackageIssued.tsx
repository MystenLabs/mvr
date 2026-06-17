import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import {
  useIssuedAttestations,
  type IssuedAttestation,
} from "@/hooks/useGetAttestations";
import { useReverseResolution } from "@/hooks/useReverseResolution";
import { Text } from "../ui/Text";
import LoadingState from "../LoadingState";
import { isNegative, readSeverity, severityBand } from "@/lib/attestations";

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
  if (!count) return null;
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
  const { data, isLoading } = useIssuedAttestations(name.package_address, network);
  const issued = data ?? [];

  const subjects = [...new Set(issued.map((i) => i.subject))];
  const { items: names } = useReverseResolution(subjects, network);
  const nameOf = (subject: string) => (names[subject] as { name?: string })?.name;

  // Live attestations group at the top; revoked ones move to their own
  // section at the bottom so they don't read as endorsements.
  const liveGroups = groupBySubject(issued.filter((i) => !i.revoked));
  const revokedGroups = groupBySubject(issued.filter((i) => i.revoked));

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
          On-chain claims this package has signed about other packages — audits,
          vulnerability disclosures, and the like. Each one also appears on the
          subject package&apos;s Security tab.
        </Text>
      </div>

      {isLoading && (
        <LoadingState size="sm" title="" description="Loading issued attestations..." />
      )}

      {!isLoading && issued.length === 0 && (
        <Text as="p" kind="paragraph" size="paragraph-small">
          This package hasn&apos;t issued any attestations.
        </Text>
      )}

      {liveGroups.map((g) => (
        <SubjectGroup key={g.subject} group={g} name={nameOf(g.subject)} />
      ))}

      {revokedGroups.length > 0 && (
        <div className="flex flex-col gap-sm border-t border-stroke-secondary pt-md">
          <Text as="div" kind="label" size="label-regular" className="text-content-tertiary">
            <p>Revoked</p>
          </Text>
          {revokedGroups.map((g) => (
            <SubjectGroup key={g.subject} group={g} name={nameOf(g.subject)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Group issued attestations by the subject they're about. */
function groupBySubject(
  items: IssuedAttestation[],
): { subject: string; items: IssuedAttestation[] }[] {
  const groups: { subject: string; items: IssuedAttestation[] }[] = [];
  for (const item of items) {
    let g = groups.find((x) => x.subject === item.subject);
    if (!g) {
      g = { subject: item.subject, items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
}

/** A card of the attestations one package issued about a single subject. */
function SubjectGroup({
  group,
  name,
}: {
  group: { subject: string; items: IssuedAttestation[] };
  name?: string;
}) {
  return (
    <div className="flex flex-col gap-sm rounded-md bg-bg-secondary p-md">
      <Text as="p" kind="label" size="label-regular">
        about <SubjectLink id={group.subject} name={name} />
      </Text>
      {group.items.map((item) => (
        <IssuedRow key={item.info.id} item={item} />
      ))}
    </div>
  );
}

function IssuedRow({ item }: { item: IssuedAttestation }) {
  const { display, innerType } = item.info;
  const negative = isNegative(item.info);
  const title = str(display["description"]) ?? str(display["name"]) ?? "Attestation";
  const severity = negative ? readSeverity(item.info) : null;
  const band = severity !== null ? severityBand(severity) : null;
  const live = !item.revoked && item.effective;

  return (
    <div
      className="flex flex-col gap-2xs rounded-sm border-l-2 py-sm pl-sm"
      style={{
        borderLeftColor: band ? band.color : "var(--stroke-accent)",
        opacity: live ? 1 : 0.5,
      }}
    >
      <div className="flex items-center justify-between gap-sm">
        <Text kind="label" size="label-small">
          {title}
          {item.revoked ? (
            <span className="ml-xs text-content-tertiary">(revoked)</span>
          ) : !item.effective ? (
            <span className="ml-xs text-content-tertiary">(expired)</span>
          ) : null}
        </Text>
        {band && (
          <span style={{ color: band.color }}>
            <Text as="span" kind="label" size="label-2xs">
              {band.label} ({severity!.toFixed(1)})
            </Text>
          </span>
        )}
      </div>
      <Text as="p" kind="paragraph" size="paragraph-xs" className="break-all font-mono opacity-50">
        {innerType.split("::").slice(1).join("::")}
      </Text>
    </div>
  );
}

/** Link a subject (attested package) to its MVR page by name, or show its id. */
function SubjectLink({ id, name }: { id: string; name?: string }) {
  if (name) {
    return (
      <a href={`/package/${name}`} className="text-content-accent underline">
        {name}
      </a>
    );
  }
  return (
    <span className="font-mono">
      {id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id}
    </span>
  );
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
