import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import { useGetMvrDependencies } from "@/hooks/useMvrDependencies";
import { beautifySuiAddress } from "@/lib/utils";
import { Text } from "../ui/Text";
import { DependencyCount } from "./SinglePackageTabs";
import { useReverseResolution } from "@/hooks/useReverseResolution";
import { DependencyLabel } from "../ui/dependency-label";

export function SinglePackageDependencies({ name }: { name: ResolvedName }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";

  const { data: dependencies } = useGetMvrDependencies(
    name.package_address,
    network,
  );

  const { items: reverseResolutionMap } = useReverseResolution(
    dependencies ?? [],
    network,
  );

  const getDependencyName = (dependency: string) => {
    const resolved = reverseResolutionMap?.[dependency];
    if (resolved) {
      return resolved.name;
    }
    return beautifySuiAddress(dependency);
  };

  const hasResolvedName = (dependency: string) => {
    const resolved = reverseResolutionMap?.[dependency]?.name;
    return !!resolved;
  };

  return (
    <>
      <Text
        kind="heading"
        size="heading-regular"
        className="flex items-center gap-sm"
      >
        Dependencies <DependencyCount name={name} network={network} />
      </Text>
      <div className="mt-md flex flex-wrap gap-xs">
        {dependencies?.map((dependency) => (
          <DependencyLabel
            key={dependency}
            dependency={
              hasResolvedName(dependency)
                ? getDependencyName(dependency)
                : dependency
            }
            isResolved={hasResolvedName(dependency)}
          />
        ))}
      </div>
    </>
  );
}
