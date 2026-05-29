import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import {
  useGetAttestations,
  type DisplayedAttestation,
} from "@/hooks/useGetAttestations";
import { Text } from "../ui/Text";
import LoadingState from "../LoadingState";
import { DependentsCountLabel } from "./SinglePackageTabs";
import type { TrustedAttestor } from "@/lib/attestations";

/** Tab label: count of effective attestations from trusted attesters. */
export function AttestationCount({
  address,
  network,
}: {
  address: string;
  network: "mainnet" | "testnet";
}) {
  const { data } = useGetAttestations(address, network);
  const count = (data ?? []).filter((a) => a.effective).length;
  if (!count) return null;
  return <DependentsCountLabel count={count} />;
}

export function SinglePackageAttestations({ name }: { name: ResolvedName }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";
  const { data, isLoading } = useGetAttestations(name.package_address, network);

  const groups = groupByAttestor(data ?? []);

  return (
    <>
      <Text as="div" kind="heading" size="heading-regular">
        <p>Attestations</p>
      </Text>

      {isLoading && (
        <LoadingState size="sm" title="" description="Loading attestations..." />
      )}

      {!isLoading && groups.length === 0 && (
        <Text as="p" kind="paragraph" size="paragraph-small" className="py-md">
          No attestations from trusted attestors.
        </Text>
      )}

      <div className="flex flex-col gap-lg py-md">
        {groups.map((g) => (
          <div
            key={g.attestor.originalId}
            className="flex flex-col gap-sm rounded-md bg-bg-secondary p-md"
          >
            <div className="flex flex-col gap-2xs">
              <Text kind="label" size="label-regular">
                {g.attestor.name}
              </Text>
              <Text
                as="p"
                kind="paragraph"
                size="paragraph-xs"
                className="break-all font-mono opacity-60"
              >
                {g.attestor.originalId}
              </Text>
            </div>
            {g.items.map((item) => (
              <AttestationRow key={item.info.id} item={item} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function AttestationRow({ item }: { item: DisplayedAttestation }) {
  const { display, innerType } = item.info;
  const title = str(display["name"]) ?? "Attestation";
  const description = str(display["description"]);
  const link = httpsLink(display["link"]);

  return (
    <div className="flex flex-col gap-2xs border-t border-border-classic pt-sm">
      <div className="flex items-center justify-between gap-sm">
        <Text kind="label" size="label-small">
          {title}
        </Text>
        <StatusBadge item={item} />
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
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-content-accent underline"
        >
          <Text as="span" kind="paragraph" size="paragraph-xs">
            {hostOf(link)}
          </Text>
        </a>
      )}
    </div>
  );
}

function StatusBadge({ item }: { item: DisplayedAttestation }) {
  const revoked = item.info.display["active"] === "false";
  const label = revoked ? "Revoked" : item.effective ? "Effective" : "Ineffective";
  const tone = item.effective
    ? "text-content-positive"
    : "text-content-negative opacity-80";
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
    let group = groups.find((g) => g.attestor.originalId === item.attestor.originalId);
    if (!group) {
      group = { attestor: item.attestor, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
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
