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
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function Packages() {
  const selectedNetwork = usePackagesNetwork();

  const { data: upgradeCaps } = useGetUpgradeCaps(selectedNetwork);
  const { data: packageInfos } = useGetPackageInfoObjects(selectedNetwork);

  const [selectedPackage, setSelectedPackage] = useState<PackageInfo | null>(
    null,
  );

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
    <main className="container min-h-full">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} className="md:min-w-[300px] lg:w-[30%]">
          <div className="grid grid-cols-1 gap-XSmall p-Regular">
            {packageInfos[selectedNetwork].map((packageInfo) => (
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
                  {" "}
                  {packageInfo.display.name}{" "}
                </Text>
                <Text variant="xxsmall/regular" className="block opacity-75">
                  {formatAddress(packageInfo.objectId)}
                </Text>
              </div>
            ))}
          </div>
        </ResizablePanel>
        <ResizableHandle disabled />
        <ResizablePanel defaultSize={75}>
          <div className="py-25">
            Wowoow
            </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
