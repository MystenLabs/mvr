"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { dAppKit } from "@/dapp-kit";

let browserQueryClient: QueryClient | undefined;

// A module-level QueryClient would be shared between all requests on the
// server (leaking hydrated data across users), so we create one per request
// there, and keep a singleton only in the browser.
function getQueryClient() {
  if (typeof window === "undefined") return new QueryClient();
  return (browserQueryClient ??= new QueryClient());
}

export default function Providers({ children }: { children: ReactNode }) {
  const client = getQueryClient();

  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <QueryClientProvider client={client}>
        <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
