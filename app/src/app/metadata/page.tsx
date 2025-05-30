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
import { useGetPackageInfo } from "@/hooks/useGetPackageInfo";

export default function Packages() {
  const selectedNetwork = usePackagesNetwork();
  const activeAddress = useActiveAddress();

  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const { data: upgradeCaps, isLoading: capsLoading } =
    useGetUpgradeCaps(selectedNetwork);
  const { data: packageInfos, isLoading: packageInfosLoading } =
    useGetPackageInfoObjects(selectedNetwork);

  const [selectedPackageId, setSelectedPackageId] = useState<
    string | undefined
  >(packageInfos?.[0]?.objectId);

  const {
    data: selectedPackage,
    isLoading: isPackageInfoLoading,
    isPending: isPackageInfoPending,
  } = useGetPackageInfo({
    network: selectedNetwork,
    objectId: selectedPackageId,
  });

  // reset selected package when address changes
  useEffect(() => {
    setSelectedPackageId(packageInfos?.[0]?.objectId);
  }, [activeAddress]);

  useEffect(() => {
    if (
      packageInfos &&
      packageInfos.length > 0 &&
      (!selectedPackage ||
        !packageInfos.find((x) => x.objectId == selectedPackageId))
    ) {
      setSelectedPackageId(packageInfos[0]?.objectId);
    }
  }, [packageInfos]);

  useEffect(() => {
    setSelectedPackageId(packageInfos?.[0]?.objectId);
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
    <main className="container flex-grow pt-xl">
      <div className="gap-md lg:flex lg:flex-grow">
        <div className="flex-shrink-0 gap-xs overflow-y-auto max-lg:py-lg lg:flex lg:h-[75vh] lg:w-[300px] lg:flex-col lg:p-md">
          <div>
            <div className="mb-sm flex items-center justify-between">
              <Label className="block">Select Metadata</Label>
              <Dialog
                open={showCreationDialog}
                onOpenChange={setShowCreationDialog}
              >
                <CreatePackageInfo
                  closeDialog={() => setShowCreationDialog(false)}
                />
                <DialogTrigger asChild>
                  <Button variant="linkActive" size="fit">
                    <Plus className="h-5 w-5 text-content-accent" />
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            <PackageInfoSelector
              disableClear
              value={selectedPackageId}
              options={packageInfos ?? []}
              onChange={(id) => setSelectedPackageId(id)}
            />
          </div>
        </div>
        <div className="max-lg:py-Large lg:p-Large block w-full break-words">
          {selectedPackage &&
            !isPackageInfoPending &&
            !isPackageInfoLoading && (
              <PackageInfoViewer packageInfo={selectedPackage} />
            )}
        </div>
      </div>
    </main>
  );
}
