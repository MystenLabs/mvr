'use client'

import { type ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { ReactQueryProvider } from "./react-query-provider";
import { SuiProvider } from "./wallet-provider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <ReactQueryProvider>
          <SuiProvider>{children}</SuiProvider>
        </ReactQueryProvider>
      </ThemeProvider>
    </>
  );
}
