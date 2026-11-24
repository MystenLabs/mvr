import { type Metadata } from "next";
import { BrowseOrganizations } from "@/components/homepage/BrowseOrganizations";
import { HomePage } from "@/components/homepage/HomePage";
import { Content } from "@/data/content";

// Title, description and Twitter card are inherited from the root layout.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: Content.seo.siteName,
    title: Content.seo.defaultTitle,
    description: Content.homepage.content,
    url: "/",
  },
};

// The page lists the largest organizations: regenerate it periodically (a
// build / render without them, e.g. during an API outage, heals itself).
export const revalidate = 300;

export default function Page() {
  // A server component, passed as a slot: its links are part of the server
  // HTML, and are not wrapped in the (JS-driven) fade-in animations.
  return <HomePage organizations={<BrowseOrganizations />} />;
}
