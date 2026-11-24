"use client";

import { useEffect, useRef, useState } from "react";
import { OrgInitialAvatar } from "@/components/org/OrgInitialAvatar";
import { PublicNameAvatar } from "@/components/org/PublicNameAvatar";
import { isPublicName, ORGS_WITH_LIGHT_AVATAR_PLATE } from "@/lib/names";
import { cn, isHttpUrl } from "@/lib/utils";

/**
 * The avatar of an organization, used everywhere an org is shown.
 *
 * The registry has no org-level metadata, so an org is represented by the icon
 * of one of its packages (`icon_url` of `GET /v1/orgs`; a user-provided URL,
 * so only http(s) is used). Without an icon, or when it fails to load, the
 * generated `OrgInitialAvatar` is shown instead.
 *
 * Public names (e.g. `@pkg`) are not organizations, and are never represented
 * by a package icon: they always get the fixed `PublicNameAvatar`.
 */
export function OrgAvatar({
  org,
  iconUrl,
  className,
}: {
  /** The org, in the `@` format (`@org`, `sub@org`). */
  org: string;
  /** The icon of one of the org's packages, when known. */
  iconUrl?: string | null;
  className?: string;
}) {
  const src = iconUrl && isHttpUrl(iconUrl) ? iconUrl : undefined;

  const [failedSrc, setFailedSrc] = useState<string>();
  const ref = useRef<HTMLImageElement>(null);

  // An image of the server HTML may have failed before hydration, in which
  // case `onError` never fires. `naturalWidth` is also 0 for some valid images
  // (e.g. SVGs without dimensions), so we reload it to get the event again.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) img.src = img.src;
  }, [src]);

  if (isPublicName(org)) return <PublicNameAvatar className={className} />;

  if (!src || failedSrc === src) {
    return <OrgInitialAvatar org={org} className={className} />;
  }

  const shape =
    "h-8 w-8 flex-shrink-0 rounded-full ring-1 ring-stroke-secondary";

  // Dark logos on a transparent background (an explicit list) get a light
  // plate, with some room around the logo.
  if (ORGS_WITH_LIGHT_AVATAR_PLATE.includes(org)) {
    return (
      <span
        className={cn(
          shape,
          "flex items-center justify-center overflow-hidden bg-[var(--color-white-100)]",
          className,
        )}
      >
        <img
          ref={ref}
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailedSrc(src)}
          className="h-3/4 w-3/4 object-contain"
        />
      </span>
    );
  }

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailedSrc(src)}
      // A circle, without a backing plate. `object-contain` keeps wide
      // (wordmark) logos whole; the faint ring keeps the shape visible for
      // logos that are as dark as the card they are on.
      className={cn(shape, "object-contain", className)}
    />
  );
}
