import { type MetadataRoute } from "next";
import { SITE_URL } from "@/lib/endpoints";

export default function robots(): MetadataRoute.Robots {
  return {
    // The wallet-only pages (`/apps`, `/metadata`) are not disallowed here:
    // crawlers must be able to fetch them to see their `noindex`.
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
