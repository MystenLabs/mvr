import "@/styles/globals.css";

import { everett, everettMono, inter } from "@/fonts";
import { type Metadata } from "next";
import { cn } from "@/lib/utils";
import Providers from "@/components/providers/Providers";
import { BaseLayout } from "@/components/layouts/BaseLayout";

export const metadata: Metadata = {
  title: "Move Registry",
  description: "Move Registry (mvr) is the on-chain package registry on Sui!",
  icons: [{ rel: "icon", url: "/favicon.png" }],
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
