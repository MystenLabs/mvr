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
import CreatePackageInfo from "@/components/modals/create-package-info/CreatePackageInfo";
import { Text } from "@/components/ui/Text";
import { formatAddress } from "@mysten/sui/utils";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PackageInfoViewer } from "@/components/packages/PackageInfoViewer";
import { useActiveAddress } from "@/hooks/useActiveAddress";
import { NetworkMissmatch } from "@/components/NetworkMissmatch";
import LoadingState from "@/components/LoadingState";

export default function Packages() {
  const selectedNetwork = usePackagesNetwork();
  const activeAddress = useActiveAddress();

  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const { data: upgradeCaps, isLoading: capsLoading } = useGetUpgradeCaps(selectedNetwork);
  const { data: packageInfos, isLoading: packageInfosLoading } = useGetPackageInfoObjects(selectedNetwork);

  const [selectedPackage, setSelectedPackage] = useState<PackageInfo | null>(
    null,
  );

  // reset selected package when address changes
  useEffect(() => {
    setSelectedPackage(packageInfos?.[0] ?? null);
  }, [activeAddress]);

  useEffect(() => {
    if (
      !selectedPackage &&
      packageInfos &&
      packageInfos.length > 0
    ) {
      setSelectedPackage(packageInfos[0] ?? null);
    }
  }, [packageInfos]);

  useEffect(() => {
    setSelectedPackage(packageInfos?.[0] ?? null);
  }, [selectedNetwork]);

  if (capsLoading || packageInfosLoading) return <LoadingState />;

  if (
    (!upgradeCaps || !upgradeCaps.length) &&
    (!packageInfos || !packageInfos.length)
  ) {
    return (
      <>
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
      </>
    );
  }

  if (!packageInfos || !packageInfos.length) {
    return (
      <>
        <EmptyState
          icon={Content.package.icon}
          title={Content.package.title}
          description={Content.package.description}
        >
          <Dialog
            open={showCreationDialog}
            onOpenChange={setShowCreationDialog}
          >
            <DialogTrigger>
              <Button variant="default">{Content.package.button}</Button>
            </DialogTrigger>
            <CreatePackageInfo
              closeDialog={() => setShowCreationDialog(false)}
            />
          </Dialog>
        </EmptyState>
      </>
    );
  }

  return (
    <main className="container flex-grow">
      <div className="gap-Regular lg:flex lg:flex-grow">
        <div className="flex-shrink-0 gap-XSmall overflow-y-auto border-border-classic p-Regular lg:flex lg:h-[75vh] lg:w-[300px] lg:flex-col lg:border-r">
          <Dialog
            open={showCreationDialog}
            onOpenChange={setShowCreationDialog}
          >
            <CreatePackageInfo
              closeDialog={() => setShowCreationDialog(false)}
            />
            <DialogTrigger>
              <Button variant="link">{Content.package.button}</Button>
            </DialogTrigger>
          </Dialog>
          {packageInfos.map((packageInfo) => (
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
        <div className="block break-words p-Large w-full">
          {selectedPackage && (
            <PackageInfoViewer packageInfo={selectedPackage} />
          )}
        </div>
      </div>
    </main>
  );
}
