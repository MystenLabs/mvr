"use client";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Content } from "../../data/content";
import { useGetUpgradeCaps } from "@/hooks/useGetUpgradeCaps";
import { useGetPackageInfoObjects } from "@/hooks/useGetPackageInfoObjects";
import { usePackagesNetwork } from "@/components/providers/packages-provider";
import Link from "next/link";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import CreatePackageInfo from "@/components/modals/create-package-info/CreatePackageInfo";
import { useEffect, useState } from "react";
import { PackageInfoViewer } from "@/components/packages/PackageInfoViewer";
import { useActiveAddress } from "@/hooks/useActiveAddress";
import LoadingState from "@/components/LoadingState";
import { PackageInfoData } from "@/utils/types";
import { PackageInfoSelector } from "@/components/ui/package-info-selector";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export default function Packages() {
  const selectedNetwork = usePackagesNetwork();
  const activeAddress = useActiveAddress();

  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const { data: upgradeCaps, isLoading: capsLoading } =
    useGetUpgradeCaps(selectedNetwork);
  const { data: packageInfos, isLoading: packageInfosLoading } =
    useGetPackageInfoObjects(selectedNetwork);

  const [selectedPackage, setSelectedPackage] =
    useState<PackageInfoData | null>(null);

  // reset selected package when address changes
  useEffect(() => {
    setSelectedPackage(packageInfos?.[0] ?? null);
  }, [activeAddress]);

  useEffect(() => {
    if (!selectedPackage && packageInfos && packageInfos.length > 0) {
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
              <Button>{Content.package.button}</Button>
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
      <div className="gap-md lg:flex lg:flex-grow">
        <div className="gap-xs max-lg:py-lg lg:p-md flex-shrink-0 overflow-y-auto lg:flex lg:h-[75vh] lg:w-[300px] lg:flex-col">
          <div>
            <div className="flex items-center justify-between mb-sm">
              <Label className="block">Select a package</Label>
              {/* TODO: Add + icon instead of the stuff before.. */}
              <Dialog
                open={showCreationDialog}
                onOpenChange={setShowCreationDialog}
              >
                <CreatePackageInfo
                  closeDialog={() => setShowCreationDialog(false)}
                />
                <DialogTrigger asChild>
                  <Button variant="linkActive" size="fit">
                    <Plus className="w-5 h-5 text-content-accent" />
                    {/* {Content.package.button} */}
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            <PackageInfoSelector
              disableClear
              value={selectedPackage?.objectId}
              options={packageInfos ?? []}
              onChange={(id) =>
                setSelectedPackage(
                  packageInfos?.find((x) => x.objectId === id) ?? null,
                )
              }
            />
          </div>
        </div>
        <div className="block w-full break-words max-lg:py-Large lg:p-Large">
          {selectedPackage && (
            <PackageInfoViewer packageInfo={selectedPackage} />
          )}
        </div>
      </div>
    </main>
  );
}
