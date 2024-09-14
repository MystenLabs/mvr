"use client";

import { ReactNode } from "react";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";

const networks = {
  devnet: { url: getFullnodeUrl("devnet") },
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

export const SuiProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <SuiClientProvider networks={networks} defaultNetwork="mainnet">
      <WalletProvider autoConnect>{children}</WalletProvider>
    </SuiClientProvider>
  );
};
