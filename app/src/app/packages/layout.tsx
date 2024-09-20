"use client";

import { useMVRContext } from "@/components/providers/mvr-provider";
import { PackagesNetworkContext } from "@/components/providers/packages-provider";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/Text";
import { useWalletNetwork } from "@/hooks/useWalletNetwork";
import { Network, Networks } from "@/utils/types";
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
        <div className="container flex gap-XSmall">
          {Object.values(Networks).map((net) => (
            <Button
              className={`rounded-none py-Large capitalize opacity-60 duration-300 ease-in-out hover:opacity-100 ${net === network && "border-b-2 opacity-100"}`}
              key={net}
              variant="custom"
              onClick={() => setNetwork(net as Network)}
            >
              <Text variant="small/regular">{net}</Text>
            </Button>
          ))}
        </div>
      </div>
      {children}
    </PackagesNetworkContext.Provider>
  );
}
