// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { MVR_ENDPOINTS } from "@/lib/endpoints";
import { getOrgFromName, isPublicName } from "@/lib/names";
import { MvrHeader } from "@/lib/utils";
import {
  type ResolvedName,
  type SearchResult,
  type SearchResultItem,
} from "@/hooks/mvrResolution";
import { gitSourceUrl } from "@/hooks/useGetSourceFromGit";
import { type OrgSearchResult, type OrgSummary } from "@/hooks/useSearchOrgs";

/**
 * Server-side data access for the MVR API (used by server components for SSR
 * & metadata). Responses go through the Next.js data cache.
 */

/** How long (seconds) a resolved name / org listing is cached on the server. */
export const NAME_REVALIDATE_SECONDS = 5 * 60;
/** How long (seconds) a README fetched from git is cached on the server. */
export const README_REVALIDATE_SECONDS = 60 * 60;

const API_TIMEOUT_MS = 4_000;
const README_TIMEOUT_MS = 4_000;
/** READMEs larger than this (in bytes) are left for the client to fetch. */
const README_MAX_BYTES = 300_000;
/** Same-host redirects followed for a README (e.g. GitHub's `a//b` -> `a/b`). */
const README_MAX_REDIRECTS = 3;

export const ORG_PAGE_SIZE = 50;

/** Page size used to list `GET /v1/orgs` (the API's maximum). */
const ORGS_API_PAGE_SIZE = 50;
/** Safety cap on the number of API pages we read to list the orgs. */
const ORGS_MAX_API_PAGES = 40;
/** Overall time budget for listing all the orgs (the orgs directory). */
const ORGS_DEADLINE_MS = 8_000;
/** Time budget for org data that only decorates another page. */
const OPTIONAL_TIMEOUT_MS = 1_500;

type MvrNetwork = keyof typeof MVR_ENDPOINTS;

/**
 * Resolves a name on a single network.
 * Returns `null` when the name does not exist (or is malformed) on that
 * network, and throws on any other failure (so that an API outage is not
 * mistaken for a missing package).
 */
export async function resolveMvrName(
  name: string,
  network: MvrNetwork,
): Promise<ResolvedName | null> {
  const response = await fetch(`${MVR_ENDPOINTS[network]}/v1/names/${name}`, {
    ...MvrHeader(),
    next: { revalidate: NAME_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) {
    throw new Error(
      `Failed to resolve MVR name ${name} on ${network} (${response.status})`,
    );
  }

  return (await response.json()) as ResolvedName;
}

export type ResolvedPackage = {
  mainnet: ResolvedName | null;
  testnet: ResolvedName | null;
  /** Networks for which the lookup failed (not "missing", but errored). */
  failed: MvrNetwork[];
  /** The network rendered first: mainnet, falling back to testnet. */
  network: MvrNetwork;
  /** The resolved name on `network`. */
  resolved: ResolvedName;
};

/**
 * Resolves a name on mainnet and testnet (mainnet takes precedence).
 * Returns `null` only if the name is known to be missing on both networks.
 * Deduplicated per request, so `generateMetadata` and the page share it.
 */
export const getResolvedPackage = cache(
  async (name: string): Promise<ResolvedPackage | null> => {
    const [mainnet, testnet] = await Promise.allSettled([
      resolveMvrName(name, "mainnet"),
      resolveMvrName(name, "testnet"),
    ]);

    const failed: MvrNetwork[] = [];
    if (mainnet.status === "rejected") failed.push("mainnet");
    if (testnet.status === "rejected") failed.push("testnet");

    const mainnetData = mainnet.status === "fulfilled" ? mainnet.value : null;
    const testnetData = testnet.status === "fulfilled" ? testnet.value : null;

    const network = mainnetData ? "mainnet" : "testnet";
    const resolved = mainnetData ?? testnetData;

    if (!resolved) {
      // We cannot tell "missing" from "API is down": surface the error (5xx)
      // instead of a 404, which could get an existing page de-indexed.
      if (failed.length) {
        throw new Error(
          `Failed to resolve MVR name ${name} (${failed.join(", ")} unavailable)`,
        );
      }
      return null;
    }

    return {
      mainnet: mainnetData,
      testnet: testnetData,
      failed,
      network,
      resolved,
    };
  },
);

/** `/`-separated values of an on-chain `path` / `tag`, safe to put in a URL. */
const encodeGitSegments = (value: string) => {
  const segments = value.split("/");
  if (segments.includes("..")) {
    throw new Error("Invalid git path");
  }
  return segments.map(encodeURIComponent).join("/");
};

/** Reads a response as text, giving up (`null`) once it exceeds `maxBytes`. */
const readTextCapped = async (response: Response, maxBytes: number) => {
  if (Number(response.headers.get("content-length")) > maxBytes) return null;
  if (!response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
};

type ReadmeResult =
  | { status: "ok"; readme: string }
  | { status: "not-found" }
  | { status: "too-large" };

/**
 * Downloads a README (size capped, only following redirects to the same host).
 * Only definitive results are returned (and cached): anything else (timeouts,
 * 5xx, other redirects) throws, so that it is retried on the next request.
 */
const fetchReadme = unstable_cache(
  async (url: string): Promise<ReadmeResult> => {
    const signal = AbortSignal.timeout(README_TIMEOUT_MS);
    // The result is cached by `unstable_cache`: caching the response too
    // would make Next.js download it in full, whatever its size.
    const init = { cache: "no-store", redirect: "manual", signal } as const;

    let response = await fetch(url, init);

    for (let i = 0; i < README_MAX_REDIRECTS; i++) {
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) break;

      const target = new URL(location, response.url || url);
      if (target.origin !== new URL(url).origin) break;

      response = await fetch(target, init);
    }

    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) {
      throw new Error(`Failed to fetch README (${response.status})`);
    }

    const readme = await readTextCapped(response, README_MAX_BYTES);
    return readme === null ? { status: "too-large" } : { status: "ok", readme };
  },
  ["package-readme"],
  { revalidate: README_REVALIDATE_SECONDS },
);

/**
 * Fetches the README of a resolved name from its git source.
 * Returns an empty string if the source is known to have no README, and
 * `null` when that is unknown (no git info, timeout, oversized file, ...), in
 * which case the client fetches it itself. Never throws.
 */
export const getPackageReadme = cache(
  async (
    repositoryUrl?: string,
    path?: string,
    tag?: string,
  ): Promise<string | null> => {
    if (!repositoryUrl || !tag) return null;

    try {
      const result = await fetchReadme(
        gitSourceUrl({
          url: repositoryUrl,
          subPath: encodeGitSegments(path ?? ""),
          tagOrHash: encodeGitSegments(tag),
          file: "README.md",
        }),
      );

      if (result.status === "ok") return result.readme;
      return result.status === "not-found" ? "" : null;
    } catch {
      return null;
    }
  },
);

export type OrgNamesPage =
  | { status: "ok"; names: SearchResultItem[]; total: number }
  /** The API returned names of other orgs: it does not support `?org=` yet. */
  | { status: "unsupported" };

const isPageAt = (
  result: { offset?: number; total?: number | null },
  offset: number,
): result is { offset: number; total: number } =>
  result.offset === offset && typeof result.total === "number";

/**
 * One page (`ORG_PAGE_SIZE` names, 1-based) of the linked names of an org, from
 * `GET /v1/names?org={org}&is_linked=true&offset=...` (cached).
 *
 * `org` is an exact match on the part of the name before `/`. Every returned
 * name is verified to belong to the org: an API that ignores the `org`
 * parameter would otherwise make us list unrelated packages.
 *
 * Throws if the page cannot be loaded (API error, timeout, or an API without
 * offset pagination): it must not be mistaken for a 404.
 */
export const getOrgNamesPage = cache(
  async (org: string, page: number): Promise<OrgNamesPage> => {
    const offset = (page - 1) * ORG_PAGE_SIZE;
    const params = new URLSearchParams({
      org,
      limit: String(ORG_PAGE_SIZE),
      offset: String(offset),
      // Names without a linked package have no package page to link to.
      is_linked: "true",
    });

    const response = await fetch(
      `${MVR_ENDPOINTS.mainnet}/v1/names?${params.toString()}`,
      {
        ...MvrHeader(),
        next: { revalidate: NAME_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      },
    );

    // The API rejects invalid orgs with a 400: same as "no such org".
    if (response.status === 400) {
      return { status: "ok", names: [], total: 0 };
    }

    if (!response.ok) {
      throw new Error(
        `Failed to list the names of ${org} (${response.status})`,
      );
    }

    const result = (await response.json()) as SearchResult;

    if (!Array.isArray(result?.data) || !isPageAt(result, offset)) {
      throw new Error(
        `Failed to list the names of ${org} (unexpected response)`,
      );
    }

    if (result.data.some((item) => getOrgFromName(item.name) !== org)) {
      return { status: "unsupported" };
    }

    return { status: "ok", names: result.data, total: result.total };
  },
);

/** Whether a value has the shape of an org of the API (`OrgSummary`). */
const isOrgSummary = (value: unknown): value is OrgSummary => {
  const org = value as OrgSummary | null;
  return (
    !!org &&
    typeof org === "object" &&
    typeof org.name === "string" &&
    typeof org.packages === "number"
  );
};

const fetchOrgsPage = async (offset: number, deadline: number) => {
  const params = new URLSearchParams({
    limit: String(ORGS_API_PAGE_SIZE),
    offset: String(offset),
  });

  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    throw new Error("Failed to list the organizations (timeout)");
  }

  const response = await fetch(
    `${MVR_ENDPOINTS.mainnet}/v1/orgs?${params.toString()}`,
    {
      ...MvrHeader(),
      // Cached as a part of the whole list, never page by page.
      cache: "no-store",
      signal: AbortSignal.timeout(Math.min(API_TIMEOUT_MS, remaining)),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to list the organizations (${response.status})`);
  }

  const result = (await response.json()) as OrgSearchResult;

  if (
    !Array.isArray(result?.data) ||
    !result.data.every(isOrgSummary) ||
    !isPageAt(result, offset)
  ) {
    throw new Error("Failed to list the organizations (unexpected response)");
  }

  return result;
};

/**
 * Lists ALL the organizations that have at least one linked package, with the
 * largest first: the first page of `GET /v1/orgs` gives the total, and the
 * other pages are then read in parallel.
 *
 * The list is ordered by package count, which changes over time: pages read
 * at (slightly) different times can repeat (or skip) an org. So the pages are
 * never cached on their own (the assembled list is, see `getOrgs`), and an org
 * that is repeated is only kept once.
 *
 * Throws if the whole list cannot be loaded (API error, unexpected response,
 * time budget or page cap exceeded).
 */
const listOrgs = async (): Promise<OrgSummary[]> => {
  const deadline = Date.now() + ORGS_DEADLINE_MS;
  const first = await fetchOrgsPage(0, deadline);

  const pages = Math.ceil(first.total / ORGS_API_PAGE_SIZE);
  if (pages > ORGS_MAX_API_PAGES) {
    throw new Error(`Failed to list all the organizations (${pages} pages)`);
  }

  const rest = await Promise.all(
    Array.from({ length: Math.max(pages - 1, 0) }, (_, i) =>
      fetchOrgsPage((i + 1) * ORGS_API_PAGE_SIZE, deadline),
    ),
  );

  const orgs = new Map<string, OrgSummary>();
  for (const org of [first, ...rest].flatMap((page) => page.data)) {
    if (!orgs.has(org.name)) orgs.set(org.name, org);
  }

  return [...orgs.values()];
};

/**
 * The whole list of organizations, cached as a single unit (one cache entry
 * for the assembled list, with a single timer). A failed walk is not cached.
 */
const getCachedOrgs = unstable_cache(listOrgs, ["mvr-orgs"], {
  revalidate: NAME_REVALIDATE_SECONDS,
});

/** All the organizations, largest first. Throws if they cannot be loaded. */
export const getOrgs = cache(() => getCachedOrgs());

/**
 * The largest organizations (at most `count`, up to the API's page size),
 * from a single (cached) page of `GET /v1/orgs`, for pages they only
 * decorate (home): `null` if they cannot be loaded quickly. Never throws.
 */
export const getLargestOrgsIfAvailable = cache(
  async (count: number): Promise<OrgSummary[] | null> => {
    try {
      const params = new URLSearchParams({
        limit: String(Math.min(count, ORGS_API_PAGE_SIZE)),
      });

      const response = await fetch(
        `${MVR_ENDPOINTS.mainnet}/v1/orgs?${params.toString()}`,
        {
          ...MvrHeader(),
          next: { revalidate: NAME_REVALIDATE_SECONDS },
          signal: AbortSignal.timeout(OPTIONAL_TIMEOUT_MS),
        },
      );
      if (!response.ok) return null;

      const result = (await response.json()) as OrgSearchResult;
      if (!Array.isArray(result?.data) || !result.data.every(isOrgSummary)) {
        return null;
      }

      return result.data;
    } catch {
      return null;
    }
  },
);

/**
 * A single organization (`GET /v1/orgs/{org}`: its package count and avatar),
 * for the pages it only decorates (org header, package pages, home).
 * `org` is the org in the `@` format (`@org`, `sub@org`).
 *
 * `null` when it is unknown: an org without linked packages, an API error or
 * timeout, or an API that does not have the endpoint (yet). Never throws.
 */
export const getOrgIfAvailable = cache(
  async (org: string): Promise<OrgSummary | null> => {
    try {
      const response = await fetch(
        `${MVR_ENDPOINTS.mainnet}/v1/orgs/${encodeURIComponent(org)}`,
        {
          ...MvrHeader(),
          next: { revalidate: NAME_REVALIDATE_SECONDS },
          signal: AbortSignal.timeout(OPTIONAL_TIMEOUT_MS),
        },
      );
      if (!response.ok) return null;

      const result: unknown = await response.json();
      // Anything else is not the org we asked for.
      if (!isOrgSummary(result) || result.name !== org) return null;

      return result;
    } catch {
      return null;
    }
  },
);

/** What a package page shows about the org of the package. */
export type PackageOrgContext = {
  org: string;
  /** The org's avatar (the icon of one of its packages), when known. */
  iconUrl: string | null;
  /** The number of (linked) packages of the org, when known. */
  packagesCount: number | null;
  /** A few other packages of the same org (empty when unknown, or none). */
  otherPackages: SearchResultItem[];
};

/**
 * The first few (linked) packages of an org, from the first page of
 * `GET /v1/names?org=` (the same, cached, request the org page starts with),
 * optionally leaving out one of them (`exclude`, a name as stored).
 * `null` when unknown (API error, timeout, `org` filter not supported).
 * Never throws.
 */
const getOrgPackagesPreview = async (
  org: string,
  max: number,
  exclude?: string,
) => {
  try {
    const params = new URLSearchParams({
      org,
      limit: String(ORG_PAGE_SIZE),
      is_linked: "true",
    });

    const response = await fetch(
      `${MVR_ENDPOINTS.mainnet}/v1/names?${params.toString()}`,
      {
        ...MvrHeader(),
        next: { revalidate: NAME_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(OPTIONAL_TIMEOUT_MS),
      },
    );
    if (!response.ok) return null;

    const result = (await response.json()) as SearchResult;
    if (!Array.isArray(result?.data)) return null;
    // An API that ignores `org` would make us list unrelated packages.
    if (result.data.some((item) => getOrgFromName(item.name) !== org)) {
      return null;
    }

    return {
      packages: result.data
        .filter((item) => item.name !== exclude)
        .slice(0, max),
      total: typeof result.total === "number" ? result.total : null,
    };
  } catch {
    return null;
  }
};

/**
 * Org data for a package page: avatar, package count and a few of the org's
 * other packages. Everything is optional: it never throws, and gives up
 * quickly, so that it cannot break (or noticeably slow down) the page.
 *
 * `name` is the package's name as stored (`@org/app`).
 */
export const getPackageOrgContext = cache(
  async (name: string, maxOtherPackages = 4): Promise<PackageOrgContext> => {
    const org = getOrgFromName(name);

    // The packages of a public name (e.g. `@pkg`) are unrelated to each
    // other: there is no "more from" it, and it has no avatar.
    if (isPublicName(org)) {
      return { org, iconUrl: null, packagesCount: null, otherPackages: [] };
    }

    const [summary, others] = await Promise.all([
      getOrgIfAvailable(org),
      getOrgPackagesPreview(org, maxOtherPackages, name),
    ]);

    return {
      org,
      iconUrl: summary?.icon_url ?? null,
      packagesCount: others?.total ?? summary?.packages ?? null,
      otherPackages: others?.packages ?? [],
    };
  },
);
