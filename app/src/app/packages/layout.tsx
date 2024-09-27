"use client";

import { NetworkMissmatch } from "@/components/NetworkMissmatch";
import { useMVRContext } from "@/components/providers/mvr-provider";
import { PackagesNetworkContext } from "@/components/providers/packages-provider";
import { TabTitle } from "@/components/ui/TabTitle";
import { Text } from "@/components/ui/Text";
import { useWalletNetwork } from "@/hooks/useWalletNetwork";
import { AvailableNetworks, Network } from "@/utils/types";
import { useEffect, useState } from "react";

export default function PackagesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isCustom } = useMVRContext();
  const walletNetwork = useWalletNetwork();
  const [network, setNetwork] = useState<Network>((isCustom || !walletNetwork) ? 'mainnet' : walletNetwork);

  useEffect(() => {
    if (isCustom) {
        setNetwork('mainnet');
        return;
    };
    if (!walletNetwork) return;
    setNetwork(walletNetwork);
  }, [isCustom, walletNetwork]);

  return (
    <PackagesNetworkContext.Provider value={network}>
      <div className="border-b border-border-classic">
        <div className="container flex">
          {Object.values(AvailableNetworks).map((net) => (
            <TabTitle key={net} active={net === network} onClick={() => setNetwork(net as Network)}>
              <Text variant="small/regular">{net}</Text>
            </TabTitle>
          ))}
        </div>
      </div>

      <NetworkMissmatch expectedNetwork={network} />
      {children}
    </PackagesNetworkContext.Provider>
  );
}
