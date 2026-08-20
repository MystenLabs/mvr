import Link from "next/link";
import { isUnregisteredPackage, ResolvedName } from "@/hooks/mvrResolution";
import { Text } from "../ui/Text";
import ImageWithFallback from "../ui/image-with-fallback";
import { beautifySuiAddress } from "@/lib/utils";
import { CopyBtn } from "../ui/CopyBtn";
import { isConfiguredAttestor } from "@/lib/attestations";
import { useTrustedAttestors } from "@/hooks/useTrustedAttestors";
import { ShieldCheckIcon } from "@/icons/single-package/ShieldCheckIcon";

/** Pill marking a package as a trusted attestor in this consumer's trust
 *  config. Links to the full trusted-attestors list. Uses next/link so the
 *  first click navigates (a plain <a> hard-navigates and was flaky here). */
function TrustedAttestorBadge() {
  return (
    <Link
      href="/attestors"
      className="flex items-center gap-2xs rounded-full bg-bg-quarternaryBleedthrough px-xs py-2xs hover:bg-bg-accentBleedthrough3"
    >
      <ShieldCheckIcon className="h-3.5 w-3.5 text-content-positive" />
      <Text kind="label" size="label-2xs">
        MVR-trusted attestor
      </Text>
    </Link>
  );
}

export function SinglePackageHeader({
  name,
  network,
}: {
  name: ResolvedName;
  network: "mainnet" | "testnet";
}) {
  const { attestors } = useTrustedAttestors(network);
  const isTrustedAttestor = isConfiguredAttestor(attestors, name.package_address);

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
              {isUnregisteredPackage(name)
                ? beautifySuiAddress(name.name)
                : name.name}
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
