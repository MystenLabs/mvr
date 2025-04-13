"use client";

import { usePackagesNetwork } from "@/components/providers/packages-provider";
import { SinglePackage } from "@/components/single-package/SinglePackage";
import { useResolveMvrName } from "@/hooks/mvrResolution";
import { useDecodedUriName } from "@/hooks/useDecodedUriName";

export default function PackagePage() {
  const decodedName = useDecodedUriName();
  const network = usePackagesNetwork();

  const { data: packageInfo } = useResolveMvrName(
    decodedName,
    network as "mainnet" | "testnet",
  );

  return (
    <div className="flex-grow">
      <div className="py-lg overflow-hidden">
        <SinglePackage name={packageInfo!} network={network as "mainnet" | "testnet"} />
      </div>
    </div>
  );
}
