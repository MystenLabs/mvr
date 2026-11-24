import { type Metadata } from "next";
import { notFound } from "next/navigation";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { JsonLd } from "@/components/JsonLd";
import { PackagePageContent } from "@/components/single-package/PackagePageContent";
import { Content } from "@/data/content";
import {
  type ResolvedName,
  resolveMvrNameQueryKey,
} from "@/hooks/mvrResolution";
import { gitSourceQueryKey } from "@/hooks/useGetSourceFromGit";
import { SITE_URL } from "@/lib/endpoints";
import {
  getPackageOrgContext,
  getPackageReadme,
  getResolvedPackage,
} from "@/lib/mvr-api";
import { isHttpUrl } from "@/lib/utils";
import {
  getOrgFromName,
  isPublicName,
  orgPath,
  packagePath,
  parsePackageNameSegments,
} from "@/lib/names";

type Props = { params: { name: string[] } };

/**
 * Resolves the route's name (mainnet first, testnet as a fallback).
 * Returns `null` if the path is not a valid `@org/app[/version]` name, or if
 * the name does not resolve on any network (the page then 404s).
 */
async function loadPackage(segments: string[]) {
  const name = parsePackageNameSegments(segments);
  if (!name) return null;

  const pkg = await getResolvedPackage(name);
  if (!pkg) return null;

  return { name, ...pkg };
}

// `notFound()` is called from the page. On a dynamic route Next.js 14
// answers it with a 404 status and an EMPTY server-rendered <body>
// (`not-found.tsx` is only rendered on the client), so this metadata is
// all that a crawler gets from a missing page.
const notFoundMetadata: Metadata = {
  title: Content.notFound.title,
  robots: { index: false },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pkg = await loadPackage(params.name);
  if (!pkg) return notFoundMetadata;

  const { resolved } = pkg;

  const title = resolved.name;
  const description =
    resolved.metadata?.description?.trim() ||
    Content.seo.package.fallbackDescription(resolved.name);
  // Versioned (`/1`), `?tab=`, `%40` & `org.sui/app` variants
  // all canonicalize to the bare name, as stored in the registry.
  const canonical = packagePath(resolved.name);
  const icon = resolved.metadata?.icon_url;
  const images = isHttpUrl(icon) ? [{ url: icon! }] : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: Content.seo.siteName,
      title: `${title} | ${Content.seo.siteName}`,
      description,
      url: canonical,
      images,
    },
    twitter: {
      card: "summary",
      title: `${title} | ${Content.seo.siteName}`,
      description,
      images,
    },
  };
}

/** Structured data, limited to the fields the registry really has. */
function packageJsonLd(resolved: ResolvedName) {
  const { metadata, git_info } = resolved;
  const org = getOrgFromName(resolved.name);

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: resolved.name,
    url: `${SITE_URL}${packagePath(resolved.name)}`,
    identifier: resolved.package_address,
    version: String(resolved.version),
    programmingLanguage: "Move",
    runtimePlatform: "Sui",
    ...(metadata?.description && { description: metadata.description }),
    ...(isHttpUrl(metadata?.icon_url) && { image: metadata.icon_url }),
    ...(isHttpUrl(git_info?.repository_url) && {
      codeRepository: git_info?.repository_url,
    }),
    // A public name (e.g. `@pkg`) is a shared namespace, not an author.
    ...(!isPublicName(org) && {
      author: {
        "@type": "Organization",
        name: org,
        url: `${SITE_URL}${orgPath(org)}`,
      },
    }),
  };
}

export default async function PackagePage({ params }: Props) {
  const pkg = await loadPackage(params.name);
  if (!pkg) notFound();

  const { name, mainnet, testnet, failed, network, resolved } = pkg;

  // Never throws. `null` (unknown) is left for the client to fetch, as
  // before; an empty string means that the source has no README.
  //
  // The org data (avatar, "more from this org") is optional: it never throws
  // either, and is loaded alongside the README with a short time budget.
  const [readme, orgContext] = await Promise.all([
    getPackageReadme(
      resolved.git_info?.repository_url,
      resolved.git_info?.path,
      resolved.git_info?.tag,
    ),
    getPackageOrgContext(resolved.name),
  ]);

  // Hand the server-fetched data to the (client) react-query hooks.
  // A network whose lookup failed is left out, so the client retries it.
  const queryClient = new QueryClient();
  if (!failed.includes("mainnet")) {
    queryClient.setQueryData(resolveMvrNameQueryKey(name, "mainnet"), mainnet);
  }
  if (!failed.includes("testnet")) {
    queryClient.setQueryData(resolveMvrNameQueryKey(name, "testnet"), testnet);
  }
  if (readme !== null) {
    queryClient.setQueryData(
      gitSourceQueryKey({
        url: resolved.git_info?.repository_url,
        subPath: resolved.git_info?.path,
        tagOrHash: resolved.git_info?.tag,
        file: "README.md",
      }),
      readme,
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JsonLd data={packageJsonLd(resolved)} />
      <PackagePageContent
        name={name}
        initialNetwork={network}
        orgContext={orgContext}
      />
    </HydrationBoundary>
  );
}
