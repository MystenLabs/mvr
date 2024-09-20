"use client";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Content } from "../../data/content";
import { useGetUpgradeCaps } from "@/hooks/useGetUpgradeCaps";
import {
  PackageInfo,
  useGetPackageInfoObjects,
} from "@/hooks/useGetPackageInfoObjects";
import { usePackagesNetwork } from "@/components/providers/packages-provider";
import Link from "next/link";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import CreatePackageInfo from "@/components/modals/CreatePackageInfo";
import { Text } from "@/components/ui/Text";
import { formatAddress } from "@mysten/sui/utils";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PackageInfoViewer } from "@/components/packages/PackageInfoViewer";

export default function Packages() {
  const selectedNetwork = usePackagesNetwork();

  const { data: upgradeCaps } = useGetUpgradeCaps(selectedNetwork);
  const { data: packageInfos } = useGetPackageInfoObjects(selectedNetwork);

  const [selectedPackage, setSelectedPackage] = useState<PackageInfo | null>(
    null,
  );

  useEffect(() => {
    if (
      !selectedPackage &&
      packageInfos &&
      packageInfos[selectedNetwork] &&
      packageInfos[selectedNetwork].length > 0
    ) {
      setSelectedPackage(packageInfos[selectedNetwork][0] ?? null);
    }
  }, [packageInfos]);

  if (
    (!upgradeCaps || upgradeCaps[selectedNetwork].length === 0) &&
    (!packageInfos || packageInfos[selectedNetwork].length === 0)
  ) {
    return (
      <EmptyState
        icon={Content.emptyStates.package.icon}
        title={Content.emptyStates.package.title}
        description={Content.emptyStates.package.description}
      >
        <Button variant="secondary" asChild>
          <Link
            href={Content.emptyStates.package.url}
            target={
              Content.emptyStates.package.url.startsWith("http")
                ? "_blank"
                : "_self"
            }
          >
            {Content.emptyStates.package.button}
          </Link>
        </Button>
      </EmptyState>
    );
  }

  if (!packageInfos || packageInfos[selectedNetwork].length === 0) {
    return (
      <EmptyState
        icon={Content.package.icon}
        title={Content.package.title}
        description={Content.package.description}
      >
        <Dialog>
          <DialogTrigger>
            <Button variant="default">{Content.package.button}</Button>
          </DialogTrigger>
          <CreatePackageInfo />
        </Dialog>
      </EmptyState>
    );
  }

  return (
    <main className="container flex-grow">
      <div className="lg:flex lg:flex-grow gap-Regular">
        <div className="lg:flex lg:flex-col gap-XSmall p-Regular flex-shrink-0 md:h-[75vh] border-r border-border-classic overflow-y-auto">
          {Array(1)
            .fill(packageInfos[selectedNetwork])
            .flat()
            .map((packageInfo) => (
              <div
                key={packageInfo.objectId}
                className={cn(
                  "cursor-pointer px-Small py-XSmall text-content-tertiary",
                  selectedPackage?.objectId === packageInfo.objectId &&
                    "rounded-md bg-primary",
                )}
                onClick={() => setSelectedPackage(packageInfo)}
              >
                <Text variant="xsmall/regular" className="block max-w-[250px]">
                  {packageInfo.display.name}
                </Text>
                <Text variant="xxsmall/regular" className="block opacity-75">
                  {formatAddress(packageInfo.objectId)}
                </Text>
              </div>
            ))}
        </div>
        <div className="p-Large block break-words">
          {selectedPackage && (
            <PackageInfoViewer packageInfo={selectedPackage} />
          )}
        </div>
      </div>
    </main>
  );
}
