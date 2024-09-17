"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { getFullnodeUrl } from "@mysten/sui/client";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";

import "@mysten/dapp-kit/dist/index.css";
import { mvrWalletTheme } from "@/data/wallet-theme";

const networks = {
  devnet: { url: getFullnodeUrl("devnet") },
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

const client = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <QueryClientProvider client={client}>
          <SuiClientProvider networks={networks} defaultNetwork="mainnet">
            <WalletProvider
              theme={mvrWalletTheme}
              stashedWallet={{ name: "Move Registry (mvr)" }}
              autoConnect
            >
              {children}
            </WalletProvider>
          </SuiClientProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
}
