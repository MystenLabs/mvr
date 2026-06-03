import { ResolvedName } from "@/hooks/mvrResolution";
import { Text } from "../ui/Text";
import ImageWithFallback from "../ui/image-with-fallback";
import { beautifySuiAddress } from "@/lib/utils";
import { CopyBtn } from "../ui/CopyBtn";
import { attestationConfig, isConfiguredAttestor } from "@/lib/attestations";

/** Shield-check glyph; color comes from the surrounding text color. */
function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** Pill marking a package as a trusted attestor in this consumer's trust
 *  config. Links to the full trusted-attestors list. */
function TrustedAttestorBadge() {
  return (
    <a
      href="/attestors"
      className="flex items-center gap-2xs rounded-full bg-bg-quarternaryBleedthrough px-xs py-2xs hover:bg-bg-accentBleedthrough3"
    >
      <ShieldCheckIcon className="h-3.5 w-3.5 text-content-positive" />
      <Text kind="label" size="label-2xs">
        MVR-trusted attestor
      </Text>
    </a>
  );
}

export function SinglePackageHeader({
  name,
  network,
}: {
  name: ResolvedName;
  network: "mainnet" | "testnet";
}) {
  const cfg = attestationConfig();
  const isTrustedAttestor =
    !!cfg && isConfiguredAttestor(cfg, name.package_address);

  return (
    <div className="container flex items-center justify-between py-md md:py-lg">
      <div className="flex items-center gap-md">
        <ImageWithFallback
          key={name.metadata?.icon_url}
          src={name.metadata?.icon_url}
          className="h-14 w-14 rounded-sm"
        />
        <div className="flex flex-col gap-2xs">
          <div className="flex items-center gap-sm">
            <Text kind="heading" size="heading-regular">
              {name.name}
            </Text>
            {isTrustedAttestor && <TrustedAttestorBadge />}
          </div>
          <Text
            kind="paragraph"
            size="paragraph-xs"
            className="flex items-center gap-2xs text-content-secondary"
          >
            Version {name.version} -{" "}
            <span className="capitalize">{network}</span> -{" "}
            {beautifySuiAddress(name.package_address)}
            <CopyBtn text={name.package_address} className="ml-2xs" size="sm" />
          </Text>
        </div>
      </div>
    </div>
  );
}
