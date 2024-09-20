"use client";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Content } from "../../data/content";
import { useGetUpgradeCaps } from "@/hooks/useGetUpgradeCaps";
import { useGetPackageInfoObjects } from "@/hooks/useGetPackageInfoObjects";
import { usePackagesNetwork } from "@/components/providers/packages-provider";

export default function Packages() {
  const selectedNetwork = usePackagesNetwork();

  const { data: upgradeCaps } = useGetUpgradeCaps(selectedNetwork);
  const { data: packageInfos } = useGetPackageInfoObjects(selectedNetwork);

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
        <Button variant="secondary">
          {Content.emptyStates.package.button}
        </Button>
      </EmptyState>
    );
  }
  return (
    <main>
      <h1>This is Move Registry packages..</h1>
    </main>
  );
}
