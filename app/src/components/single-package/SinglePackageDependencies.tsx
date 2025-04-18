import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import { useGetMvrDependencies } from "@/hooks/useMvrDependencies";
import { beautifySuiAddress } from "@/lib/utils";
import { Text } from "../ui/Text";
import { DependencyCount } from "./SinglePackageTabs";
import { useReverseResolution } from "@/hooks/useReverseResolution";
import { DependencyLabel } from "../ui/dependency-label";
import { Accordion, AccordionContent, AccordionTrigger } from "../ui/accordion";
import { AccordionItem } from "../ui/accordion";
import { useGetMvrVersionAddresses } from "@/hooks/useGetMvrVersionAddresses";
import LoadingState from "../LoadingState";
import { LoadMore } from "../ui/load-more";

export function SinglePackageDependencies({ name }: { name: ResolvedName }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";

  const {
    data: versionAddresses,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = useGetMvrVersionAddresses(name.name, name.version, network);

  return (
    <>
      <Text
        as="div"
        kind="heading"
        size="heading-regular"
        className="flex items-center gap-sm"
      >
        <p>Dependencies</p>
      </Text>
      {isLoading && (
        <LoadingState size="sm" title="" description="Loading..." />
      )}
      <Accordion type="multiple" defaultValue={[name.package_address]}>
        {versionAddresses &&
          versionAddresses.map((version) => (
            <SinglePackageDependenciesAccordion
              key={version.version}
              address={version.address}
              version={version.version}
              isLatestVersion={version.version === name.version}
            />
          ))}

        <LoadMore
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isLoading={isLoading}
        />
      </Accordion>
    </>
  );
}

function SinglePackageDependenciesAccordion({
  address,
  version,
  isLatestVersion,
}: {
  address: string;
  version: number;
  isLatestVersion: boolean;
}) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";

  const { data: dependencies } = useGetMvrDependencies(address, network);

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
    <AccordionItem value={address} className="border-b border-stroke-secondary">
      <AccordionTrigger className="flex items-center">
        <div className="flex flex-shrink-0 items-center gap-sm">
          <Text as="div">
            Version {version}{" "}
            <span className="text-content-secondary">
              {isLatestVersion ? "(latest)" : ""}
            </span>
          </Text>

          <DependencyCount
            address={address}
            network={network}
            className="flex-shrink-0"
          />
        </div>
      </AccordionTrigger>
      <AccordionContent className="max-h-[500px] overflow-y-auto">
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
      </AccordionContent>
    </AccordionItem>
  );
}
