import { type Metadata } from "next";
import { AppsLayout } from "@/components/layouts/AppsLayout";
import { Content } from "@/data/content";

// Wallet-gated page: nothing to index.
export const metadata: Metadata = {
  title: Content.seo.apps.title,
  robots: { index: false, follow: false },
};

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppsLayout>{children}</AppsLayout>;
}
