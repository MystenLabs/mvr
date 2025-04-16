import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import {
  useGetMvrDependencies,
  useGetMvrDependents,
} from "@/hooks/useMvrDependencies";
import { beautifySuiAddress } from "@/lib/utils";
import { Text } from "../ui/Text";
import { DependencyCount, DependentsCount } from "./SinglePackageTabs";
import { useReverseResolution } from "@/hooks/useReverseResolution";
import { DependencyLabel } from "../ui/dependency-label";
import { Button } from "../ui/button";
import LoadingState from "../LoadingState";

export function SinglePackageDependents({ name }: { name: ResolvedName }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";

  const {
    data: dependents,
    isLoading,
    hasNextPage,
    fetchNextPage,
  } = useGetMvrDependents(name.package_address, network);

  const { items: reverseResolutionMap } = useReverseResolution(
    dependents?.packages.map((p) => p.package_id) ?? [],
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
        as="div"
        kind="heading"
        size="heading-regular"
        className="flex items-center gap-sm"
      >
        Dependents <DependentsCount name={name} network={network} />
      </Text>
      {isLoading && (
        <LoadingState size="sm" title="" description="Loading..." />
      )}
      <div className="mt-md flex flex-wrap gap-xs">
        {dependents?.packages.map((dependency, index) => (
          <DependencyLabel
            key={index}
            dependency={
              hasResolvedName(dependency.package_id)
                ? getDependencyName(dependency.package_id)
                : dependency.package_id
            }
            isResolved={hasResolvedName(dependency.package_id)}
          />
        ))}
      </div>
      {hasNextPage && (
        <div className="mt-md flex justify-center">
          <Button
            onClick={() => fetchNextPage()}
            variant="linkActive"
            size="fit"
            className="mt-md mx-auto"
            disabled={isLoading}
          >
            Load more
          </Button>
        </div>
      )}
    </>
  );
}
