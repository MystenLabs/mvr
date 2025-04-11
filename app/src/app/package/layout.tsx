"use client";

import Header from "@/components/Header";
import { WalletConnectedContent } from "@/components/layouts/WalletConnectedContent";
import { useMVRContext } from "@/components/providers/mvr-provider";
import { PackagesNetworkContext } from "@/components/providers/packages-provider";
import { TabTitle } from "@/components/ui/TabTitle";
import { Text } from "@/components/ui/Text";
import { useResolveMvrName } from "@/hooks/mvrResolution";
import { useActiveAddress } from "@/hooks/useActiveAddress";
import { useDecodedUriName } from "@/hooks/useDecodedUriName";
import { useWalletNetwork } from "@/hooks/useWalletNetwork";
import { switchGlobalAccent } from "@/lib/utils";
import { AvailableNetworks, Network } from "@/utils/types";
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import LoadingState from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { Content } from "@/data/content";

export default function PackagesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isCustom } = useMVRContext();
  const activeAddress = useActiveAddress();
  const walletNetwork = useWalletNetwork();

  const decodedName = useDecodedUriName();

  const [network, setNetwork] = useState<Network>(
    isCustom || !walletNetwork ? "mainnet" : walletNetwork,
  );

  const { data: mainnetData, isLoading: isMainnetLoading } = useResolveMvrName(
    decodedName,
    "mainnet",
  );
  const { data: testnetData, isLoading: isTestnetLoading } = useResolveMvrName(
    decodedName,
    "testnet",
  );

  useEffect(() => {
    if (isCustom) {
      setNetwork("mainnet");
      return;
    }
    if (!walletNetwork) return;
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
    if (network === "mainnet" && !mainnetData && testnetData) setNetwork("testnet");
    if (network === "testnet" && !testnetData && mainnetData) setNetwork("mainnet");
  }, [mainnetData, testnetData, network, isMainnetLoading, isTestnetLoading]);

  if (isMainnetLoading || isTestnetLoading) {
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

  return (
    <>
      <Header>
        {!!activeAddress && (
          <div className="">
            <div className="gap-lg container flex min-h-[75px] items-end">
              {Object.values(AvailableNetworks)
                .filter((net) => {
                  if (net === "mainnet") {
                    return !!mainnetData;
                  }
                  if (net === "testnet") {
                    return !!testnetData;
                  }
                  return false;
                })
                .map((net) => (
                  <TabTitle
                    key={net}
                    active={net === network}
                    onClick={() => setNetwork(net as Network)}
                  >
                    <Text kind="label" size="label-regular">
                      {net}
                    </Text>
                  </TabTitle>
                ))}
            </div>
          </div>
        )}
      </Header>
      <WalletConnectedContent>
        <PackagesNetworkContext.Provider value={network}>
          {children}
        </PackagesNetworkContext.Provider>
      </WalletConnectedContent>
    </>
  );
}
