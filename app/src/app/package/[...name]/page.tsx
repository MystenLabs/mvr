"use client";

import { usePackagesNetwork } from "@/components/providers/packages-provider";
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
      <div className="py-lg container overflow-hidden">
        <h2>TODO: Implement this page!</h2>
        <pre>{JSON.stringify(packageInfo, null, 2)}</pre>
      </div>
    </div>
  );
}
