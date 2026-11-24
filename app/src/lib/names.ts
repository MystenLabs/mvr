// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidNamedPackage, isValidSuiNSName } from "@mysten/sui/utils";

/** The global public name of MVR. */
export const PKG_PUBLIC_NAME = "@pkg";

/**
 * The known public names: shared namespaces (see `packages/public_names`)
 * under which anyone can register a package, without owning the SuiNS name.
 * They are NOT organizations: their packages are unrelated to each other, and
 * must not be presented as published by the name.
 *
 * This is the single list for the web app (the API has the same one, and
 * flags them as `is_public_name` in `GET /v1/orgs`).
 */
export const PUBLIC_NAMES: readonly string[] = [PKG_PUBLIC_NAME];

/**
 * The organizations featured on the homepage, in display order. One that has
 * no (linked) packages is skipped.
 */
export const FEATURED_ORGS: readonly string[] = [
  "@mysten",
  "@deepbook",
  "@suins",
];

/**
 * Organizations whose avatar (the icon of one of their packages) is a dark
 * logo on a transparent background: it gets a light plate, to stay legible
 * on the (dark) site. See `OrgAvatar`.
 */
export const ORGS_WITH_LIGHT_AVATAR_PLATE: readonly string[] = ["@suins"];

/** Whether an org part (`@org`) of a name is a public name (e.g. `@pkg`). */
export const isPublicName = (org: string) => PUBLIC_NAMES.includes(org);

/** Returns the org part of a MVR name (`@org/app` -> `@org`). */
export const getOrgFromName = (name: string) => name.split("/")[0] ?? "";

/** Returns the app part of a MVR name (`@org/app` -> `app`). */
export const getAppFromName = (name: string) => name.split("/")[1] ?? "";

/** Site path of a package page. `name` must be the name as stored (`@org/app`). */
export const packagePath = (name: string) => `/package/${name}`;

/** Site path of an organization page (`/org/@org`), optionally paginated. */
export const orgPath = (org: string, page = 1) =>
  `/org/${org}${page > 1 ? `?page=${page}` : ""}`;

/** Site path of the organizations directory. */
export const ORGS_PATH = "/orgs";

const safeDecode = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
};

/**
 * Decodes the `[...name]` route segments (handling `%40` -> `@`) into a MVR
 * name (`@org/app` or `@org/app/1`). Returns `null` for anything that cannot
 * be a valid name, so the caller can 404 without hitting the API.
 */
export const parsePackageNameSegments = (segments: string[]) => {
  const decoded = segments.map(safeDecode);
  if (decoded.some((x) => x === null)) return null;

  const name = decoded.join("/");
  return isValidNamedPackage(name) ? name : null;
};

/**
 * Decodes the `[org]` route segment into a lowercase org name in the `@`
 * format (`@org`, `sub@org`). Returns `null` if it is not a valid org.
 */
export const parseOrgSegment = (segment: string) => {
  const org = safeDecode(segment)?.toLowerCase();
  if (!org?.includes("@") || !isValidSuiNSName(org)) return null;
  return org;
};
