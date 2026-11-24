import { type Metadata } from "next";
import { MetadataLayout } from "@/components/layouts/MetadataLayout";
import { Content } from "@/data/content";

// Wallet-gated page: nothing to index.
export const metadata: Metadata = {
  title: Content.seo.metadata.title,
  robots: { index: false, follow: false },
};

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MetadataLayout>{children}</MetadataLayout>;
}
