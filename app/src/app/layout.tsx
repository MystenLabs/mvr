import "@/styles/globals.css";

import { everett, everettMono, inter } from "@/fonts";
import { type Metadata } from "next";
import { cn } from "@/lib/utils";
import Providers from "@/components/providers/Providers";
import { BaseLayout } from "@/components/layouts/BaseLayout";
import { Content } from "@/data/content";
import { SITE_URL } from "@/lib/endpoints";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: Content.seo.defaultTitle,
    template: `%s | ${Content.seo.siteName}`,
  },
  description: Content.homepage.content,
  icons: [{ rel: "icon", url: "/default-icon.svg" }],
  // NOTE: `openGraph` / `twitter` are replaced (not merged) by pages that
  // define their own. Canonicals are intentionally set per page.
  openGraph: {
    type: "website",
    siteName: Content.seo.siteName,
    title: Content.seo.defaultTitle,
    description: Content.homepage.content,
  },
  twitter: {
    card: "summary",
    title: Content.seo.defaultTitle,
    description: Content.homepage.content,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(everett.variable, everettMono.variable, inter.variable, "scroll-smooth")}
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
