"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { getFullnodeUrl } from "@mysten/sui/client";
import { SuiClientProvider } from "@mysten/dapp-kit";
import dynamic from "next/dynamic";

const networks = {
  devnet: { url: getFullnodeUrl("devnet") },
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

const WalletProvider = dynamic(() => import('@mysten/dapp-kit').then((p) => p.WalletProvider), {
  ssr: false,
});


const client = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <QueryClientProvider client={client}>
          <SuiClientProvider networks={networks} defaultNetwork="mainnet">
            <WalletProvider autoConnect>{children}</WalletProvider>
          </SuiClientProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
}
