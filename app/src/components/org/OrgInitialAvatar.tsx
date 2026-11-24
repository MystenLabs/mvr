import { cn } from "@/lib/utils";

/** The design system's organization palette (see `--bg-org-*`). */
const PALETTE = [
  "var(--bg-org-blue)",
  "var(--bg-org-purple)",
  "var(--bg-org-pink)",
  "var(--bg-org-red)",
  "var(--bg-org-orange)",
  "var(--bg-org-yellow)",
  "var(--bg-org-green)",
  "var(--bg-org-turquoise)",
];

/** A small, stable string hash (FNV-1a). */
const hash = (value: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/**
 * The generated avatar of an organization: its initial, on a tint picked from
 * its name. Used when the org has no (working) icon: see `OrgAvatar`.
 *
 * It is a pure function of the org name: the same on the server and on the
 * client, without any image request.
 */
export function OrgInitialAvatar({
  org,
  className,
}: {
  /** The org, in the `@` format (`@org`, `sub@org`). */
  org: string;
  className?: string;
}) {
  const initial = (org.match(/[a-z0-9]/i)?.[0] ?? "?").toUpperCase();
  const background = PALETTE[hash(org) % PALETTE.length];

  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className={cn("h-8 w-8 flex-shrink-0 font-inter", className)}
    >
      <circle cx="16" cy="16" r="16" fill={background} />
      <text
        x="16"
        y="16"
        dy="0.36em"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="var(--content-primary-inverse)"
      >
        {initial}
      </text>
    </svg>
  );
}
