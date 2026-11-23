"use client";

import Header from "@/components/Header";
import { useMVRContext } from "@/components/providers/mvr-provider";
import { PackagesNetworkContext } from "@/components/providers/packages-provider";
import { TabTitle } from "@/components/ui/TabTitle";
import { Text } from "@/components/ui/Text";
import { useResolveMvrName } from "@/hooks/mvrResolution";
import { useWalletNetwork } from "@/hooks/useWalletNetwork";
import { switchGlobalAccent } from "@/lib/utils";
import { AvailableNetworks } from "@/utils/types";
import { useEffect, useState } from "react";
import LoadingState from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { Content } from "@/data/content";
import { SinglePackageHeader } from "@/components/single-package/SinglePackageHeader";
import { SinglePackage } from "@/components/single-package/SinglePackage";
import { type PackageOrgContext } from "@/lib/mvr-api";

type PackageNetwork = "mainnet" | "testnet";

/**
 * The interactive part of a package page (network switch, tabs, wallet).
 *
 * The name is resolved on the server (`src/app/package/[...name]/page.tsx`)
 * and handed over through the react-query cache, so both the server render
 * and the first client render already have the data.
 */
export function PackagePageContent({
  name,
  initialNetwork,
  orgContext,
}: {
  /** Optional data about the org of the package (see `getPackageOrgContext`). */
  orgContext?: PackageOrgContext;
  /** The decoded name from the URL (e.g. `@org/app` or `@org/app/1`). */
  name: string;
  /** The network the server rendered (mainnet, or testnet as a fallback). */
  initialNetwork: PackageNetwork;
}) {
  const { isCustom } = useMVRContext();
  const walletNetwork = useWalletNetwork();

  // Start from the server's choice (keeps hydration deterministic); the
  // wallet's network is applied right after mount by the effect below.
  const [network, setNetwork] = useState<PackageNetwork>(initialNetwork);

  const { data: mainnetData, isLoading: isMainnetLoading } = useResolveMvrName(
    name,
    "mainnet",
  );
  const { data: testnetData, isLoading: isTestnetLoading } = useResolveMvrName(
    name,
    "testnet",
  );

  useEffect(() => {
    if (isCustom) {
      setNetwork("mainnet");
      return;
    }
    if (walletNetwork !== "mainnet" && walletNetwork !== "testnet") return;
    setNetwork(walletNetwork);
  }, [isCustom, walletNetwork]);

  // We're switching the accent color globally, to make sure modals
  // also inherit the different palette.
  useEffect(() => {
    switchGlobalAccent(network === "testnet");
    return () => switchGlobalAccent(false);
  }, [network]);

  useEffect(() => {
    if (isMainnetLoading || isTestnetLoading) return;
    if (mainnetData && testnetData) return;
    if (network === "mainnet" && !mainnetData && testnetData)
      setNetwork("testnet");
    if (network === "testnet" && !testnetData && mainnetData)
      setNetwork("mainnet");
  }, [mainnetData, testnetData, network, isMainnetLoading, isTestnetLoading]);

  const isLoading = isMainnetLoading || isTestnetLoading;

  // Only block on loading when there is nothing to show yet.
  if (isLoading && !mainnetData && !testnetData) {
    return (
      <>
        <Header />
        <LoadingState />
      </>
    );
  }

  if (!mainnetData && !testnetData) {
    return (
      <>
        <Header />
        <EmptyState {...Content.emptyStates.packageNotFound} />
      </>
    );
  }

  const data = { mainnet: mainnetData, testnet: testnetData };
  // While the other network is still loading (or the network effect has not
  // run yet), show the network we do have data for.
  const activeNetwork: PackageNetwork = data[network]
    ? network
    : network === "mainnet"
      ? "testnet"
      : "mainnet";
  const packageInfo = data[activeNetwork];

  return (
    <>
      <Header>
        {packageInfo && (
          <SinglePackageHeader
            name={packageInfo}
            network={activeNetwork}
            orgContext={orgContext}
          />
        )}
        <div className="">
          <div className="container flex min-h-[75px] items-end gap-lg">
            {(Object.values(AvailableNetworks) as PackageNetwork[])
              .filter((net) => !!data[net])
              .map((net) => (
                <TabTitle
                  key={net}
                  active={net === activeNetwork}
                  onClick={() => setNetwork(net)}
                >
                  <Text kind="label" size="label-regular">
                    {net}
                  </Text>
                </TabTitle>
              ))}
          </div>
        </div>
      </Header>
      <PackagesNetworkContext.Provider value={activeNetwork}>
        <div className="flex-grow">
          <div className="overflow-hidden py-lg">
            {packageInfo && (
              <SinglePackage
                name={packageInfo}
                network={activeNetwork}
                org={orgContext}
              />
            )}
          </div>
        </div>
      </PackagesNetworkContext.Provider>
    </>
  );
}
