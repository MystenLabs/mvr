import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { everett, everettMono, inter } from "@/fonts";
import { type Metadata } from "next";
import { cn } from "@/lib/utils";
import Providers from "@/components/providers/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
              <Header />
              {children}
              <Footer />
          </Providers>
        </body>
    </html>
  );
}
