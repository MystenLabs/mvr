import { ResolvedName } from "@/hooks/mvrResolution";
import { usePackagesNetwork } from "../providers/packages-provider";
import { useGetMvrDependents } from "@/hooks/useMvrDependencies";
import { beautifySuiAddress } from "@/lib/utils";
import { Text } from "../ui/Text";
import { DependentsCount } from "./SinglePackageTabs";
import { useReverseResolution } from "@/hooks/useReverseResolution";
import { DependencyLabel } from "../ui/dependency-label";
import { Button } from "../ui/button";
import LoadingState from "../LoadingState";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion";
import { useGetMvrVersionAddresses } from "@/hooks/useGetMvrVersionAddresses";
import { InfoIcon } from "lucide-react";
import { TooltipWrapper } from "../ui/tooltip";
import { LoadMore } from "../ui/load-more";

export function SinglePackageDependents({ name }: { name: ResolvedName }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";

  const {
    data: versionAddresses,
    isLoading,
    fetchNextPage,
    hasNextPage
  } = useGetMvrVersionAddresses(name.name, name.version, network);

  return (
    <>
      <Text
        as="div"
        kind="heading"
        size="heading-regular"
        className="flex items-center gap-sm"
      >
        <p>Dependents</p>
        <TooltipWrapper
          tooltipText="Packages (on mainnet) are listed in order of number of calls, from highest to lowest."
          tooltipPlace="top"
        >
          <Button variant="link" size="fit">
            <InfoIcon className="h-4 w-4" />
          </Button>
        </TooltipWrapper>
      </Text>
      {isLoading && (
        <LoadingState size="sm" title="" description="Loading..." />
      )}
      <Accordion type="multiple" defaultValue={[name.package_address]}>
        {versionAddresses &&
          versionAddresses.map((version) => (
            <SinglePackageDependendAccordion
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

export function SinglePackageDependendAccordion({
  address,
  version,
  isLatestVersion,
}: {
  address: string;
  version: number;
  isLatestVersion: boolean;
}) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";

  const {
    data: dependents,
    isLoading,
    hasNextPage,
    fetchNextPage,
  } = useGetMvrDependents(address, network);

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
    <AccordionItem value={address} className="border-b border-stroke-secondary">
      <AccordionTrigger className="flex items-center">
        <div className="flex flex-shrink-0 items-center gap-sm">
          <Text as="div">
            Version {version}{" "}
            <span className="text-content-secondary">
              {isLatestVersion ? "(latest)" : ""}
            </span>
          </Text>

          <DependentsCount
            address={address}
            network={network}
            className="flex-shrink-0"
          />
        </div>
      </AccordionTrigger>
      <AccordionContent className="max-h-[500px] overflow-y-auto">
        <div className="mt-md flex flex-wrap gap-xs">
          {dependents?.packages.length === 0 && (
            <Text
              kind="paragraph"
              size="paragraph-small"
              className="text-content-secondary"
            >
              No dependents found for this version.
            </Text>
          )}
          {dependents?.packages.map((dependency, index) => (
            <DependencyLabel
              key={index}
              dependency={
                hasResolvedName(dependency.package_id)
                  ? getDependencyName(dependency.package_id)
                  : dependency.package_id
              }
              isResolved={hasResolvedName(dependency.package_id)}
              calls={dependency.aggregated_total_calls}
            />
          ))}
        </div>

        <LoadMore
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isLoading={isLoading}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
