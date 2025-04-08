"use client";

import Header from "@/components/Header";
import { WalletConnectedContent } from "@/components/layouts/WalletConnectedContent";
import { useMVRContext } from "@/components/providers/mvr-provider";
import { PackagesNetworkContext } from "@/components/providers/packages-provider";
import { TabTitle } from "@/components/ui/TabTitle";
import { Text } from "@/components/ui/Text";
import { useActiveAddress } from "@/hooks/useActiveAddress";
import { useWalletNetwork } from "@/hooks/useWalletNetwork";
import { cn, switchGlobalAccent } from "@/lib/utils";
import { AvailableNetworks, Network } from "@/utils/types";
import { useEffect, useState } from "react";

export default function PackagesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isCustom } = useMVRContext();
  const activeAddress = useActiveAddress();
  const walletNetwork = useWalletNetwork();
  const [network, setNetwork] = useState<Network>(
    isCustom || !walletNetwork ? "mainnet" : walletNetwork,
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

  return (
    <>
      <Header>
        {!!activeAddress && (
          <div className="">
            <div className="gap-lg container flex min-h-[75px] items-end">
              {Object.values(AvailableNetworks).map((net) => (
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
