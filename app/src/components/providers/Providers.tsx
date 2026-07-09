"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { dAppKit } from "@/dapp-kit";

const client = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <QueryClientProvider client={client}>
        <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
