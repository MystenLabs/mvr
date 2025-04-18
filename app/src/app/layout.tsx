import "@/styles/globals.css";

import { everett, everettMono, inter } from "@/fonts";
import { type Metadata } from "next";
import { cn } from "@/lib/utils";
import Providers from "@/components/providers/Providers";
import { BaseLayout } from "@/components/layouts/BaseLayout";

export const metadata: Metadata = {
  title: "Move Package Registry",
  description:
    "MVR is the central hub for discovering, sharing, and managing Move packages on the Sui blockchain. Build secure, scalable, and innovative decentralized applications with the power of Move.",
  icons: [{ rel: "icon", url: "/default-icon.svg" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(everett.variable, everettMono.variable, inter.variable)}
      suppressHydrationWarning
    >
      <body>
        <Providers>
          <BaseLayout>{children}</BaseLayout>
        </Providers>
      </body>
    </html>
  );
}
