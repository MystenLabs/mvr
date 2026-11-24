import { type Metadata } from "next";
import Header from "@/components/Header";
import { OrgsDirectory } from "@/components/org/OrgsDirectory";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { getOrgs } from "@/lib/mvr-api";
import { isPublicName, ORGS_PATH } from "@/lib/names";
import { PublicNameCard } from "@/components/org/PublicNameCard";

// The directory is data-driven: render it on request (API responses are
// cached), instead of freezing it (or failing the build) at build time.
export const dynamic = "force-dynamic";

/**
 * The organizations, and (separately) the public names (e.g. `@pkg`), which
 * are shared namespaces and must not be listed as organizations.
 * Shared (per request) by the metadata and the page; a failure is a 5xx.
 */
async function loadDirectory() {
  const all = await getOrgs();

  return {
    orgs: all.filter((org) => !isPublicName(org.name)),
    publicNames: all.filter((org) => isPublicName(org.name)),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { orgs } = await loadDirectory();

  const title = Content.seo.orgs.title;
  const description = Content.seo.orgs.description(orgs.length);

  return {
    title,
    description,
    alternates: { canonical: ORGS_PATH },
    openGraph: {
      type: "website",
      siteName: Content.seo.siteName,
      title: `${title} | ${Content.seo.siteName}`,
      description,
      url: ORGS_PATH,
    },
    twitter: {
      card: "summary",
      title: `${title} | ${Content.seo.siteName}`,
      description,
    },
  };
}

export default async function OrgsPage() {
  const { orgs, publicNames } = await loadDirectory();

  return (
    <>
      <Header>
        <div className="container flex flex-col gap-2xs py-md md:py-lg">
          <Text as="h1" kind="heading" size="heading-regular">
            {Content.orgs.title}
          </Text>
          <Text
            kind="paragraph"
            size="paragraph-small"
            className="text-content-secondary"
          >
            {Content.orgs.subtitle(orgs.length)}
          </Text>
        </div>
      </Header>
      <div className="flex-grow">
        <div className="container py-lg">
          <OrgsDirectory orgs={orgs}>
            {publicNames.map((name) => (
              <PublicNameCard key={name.name} name={name} />
            ))}
          </OrgsDirectory>
        </div>
      </div>
    </>
  );
}
