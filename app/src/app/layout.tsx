import "@/styles/globals.css";

import { everett, everettMono, inter } from "@/fonts";
import { type Metadata } from "next";
import { cn } from "@/lib/utils";
import Providers from "@/components/providers/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MVRContext, MVRSetup } from "@/components/providers/mvr-provider";
import { useEffect, useState } from "react";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { BaseLayout } from "@/components/layouts/BaseLayout";

export const metadata: Metadata = {
  title: "Move Registry",
  description: "Move Registry (mvr) is the on-chain package registry on Sui!",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(everett.variable, everettMono.variable, inter.variable)}>
      <body>
          <Providers>
            <BaseLayout>
              {children}
            </BaseLayout>
          </Providers>
        </body>
    </html>
  );
}
