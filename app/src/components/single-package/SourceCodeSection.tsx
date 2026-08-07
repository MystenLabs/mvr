import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, LinkIcon } from "lucide-react";
import { ResolvedName } from "@/hooks/mvrResolution";
import { useResolveGitCommit, parseGithubRepo } from "@/hooks/useResolveGitCommit";
import {
  useSourceVerification,
  type SourceVerification,
} from "@/hooks/useSourceVerification";
import { Text } from "../ui/Text";
import { Button } from "../ui/button";
import { CopyBtn } from "../ui/CopyBtn";
import ExplorerLink from "../ui/explorer-link";
import { CheckIcon } from "@/icons/single-package/CheckIcon";
import {
  SinglePackageContent,
  SinglePackageSidebarTitle,
} from "./SinglePackageLayout";

const shortSha = (s: string) => s.slice(0, 10);
const truncateId = (id: string) =>
  id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;

/** A filled info badge: a blue disc with a white "i" (lucide's `Info` is outline
 *  only). Colours are baked in rather than `currentColor`, since it's a status
 *  glyph, not text. */
function InfoFilled({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="var(--color-pastel-blue)" />
      <circle cx="12" cy="7.5" r="1.5" fill="#fff" />
      <rect x="10.5" y="10.25" width="3" height="7.25" rx="1.5" fill="#fff" />
    </svg>
  );
}

/**
 * The sidebar "Source Code" block: the repository link, with a header that
 * states the source's verification status.
 *
 * Verified means: the git_info link (repo + tag) resolves to a commit, and a
 * trusted source-verification attestation about this package covers that exact
 * commit. Matching the *resolved* link is what lets "Verified" mean "the source
 * you're looking at is verified"; a moved tag that outruns an older verification
 * correctly reads as unverified.
 *
 * We only assert a status when we could actually check — testnet (where the
 * registry lives), a resolvable commit, and loaded attestations. Otherwise the
 * header stays a neutral "Source Code" rather than a misleading "Unverified".
 */
export function SourceCodeSection({
  href,
  name,
  network,
}: {
  href: string;
  name: ResolvedName;
  network: "mainnet" | "testnet";
}) {
  const [open, setOpen] = useState<boolean | undefined>(undefined);
  const { data: commit } = useResolveGitCommit(name.git_info);
  const { data: verifications } = useSourceVerification(
    name.package_address,
    network,
  );

  const canCheck = !!commit && verifications !== undefined;
  const match = canCheck
    ? verifications!.find((v) => v.gitSha.toLowerCase() === commit!.toLowerCase())
    : undefined;

  // Default open when unverified (a quiet, useful note), closed when verified
  // (noisier detail). Once the user toggles, `open` holds their explicit choice.
  const isOpen = open ?? (!!canCheck && !match);

  // The Source Code link *navigates* to the exact source (resolved commit +
  // subdirectory) but *displays* the plain repo URL — the full tree URL is too
  // long to read. Falls back to the repo URL until the commit resolves / off GitHub.
  const sourceUrl = sourceTreeUrl(name.git_info, commit) ?? href;

  return (
    <SinglePackageContent>
      <SinglePackageSidebarTitle>
        {canCheck ? (
          // Verified/unverified both expand: verified to the attested detail,
          // unverified to just the "how it works" note. Styling is inherited
          // from the title so the header matches the others; only the leading
          // icon distinguishes the state.
          <button
            type="button"
            onClick={() => setOpen(!isOpen)}
            aria-expanded={isOpen}
            // `uppercase` explicitly: a <button> doesn't inherit text-transform
            // from the title, so without it this header wouldn't match the others.
            className="flex items-center gap-2xs uppercase"
          >
            {match ? (
              <CheckIcon className="h-3.5 w-3.5 text-content-positive" />
            ) : (
              <InfoFilled className="h-3.5 w-3.5" />
            )}
            {match ? "Verified source code" : "Unverified source code"}
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          "Source Code"
        )}
      </SinglePackageSidebarTitle>

      <Button
        variant="linkActive"
        className="flex items-center justify-start gap-2xs whitespace-break-spaces !break-all !px-0 text-left !text-12"
        onClick={() => window.open(sourceUrl, "_blank")}
      >
        <LinkIcon className="mr-2xs h-4 w-4 flex-shrink-0" />
        {href}
      </Button>

      {isOpen && canCheck && (
        <div className="mt-xs flex flex-col gap-xs">
          {match ? (
            <VerificationDetail v={match} network={network} />
          ) : (
            verifications!.length > 0 &&
            name.git_info && (
              <VerifiedCommits
                verifications={verifications!}
                repoUrl={name.git_info.repository_url}
                currentCommit={commit!}
              />
            )
          )}
          <SourceVerificationNote verified={!!match} />
        </div>
      )}
    </SinglePackageContent>
  );
}

/** MVR page for the source-verification service — the "learn more" target. Not
 *  registered yet (pending a multisig), so this 404s until the name lands. */
const SV_MVR_PAGE = "/package/@mysten/source-verification";

/** Learn-more note shown under both headers. On the unverified header it first
 *  clarifies that "unverified" means "unchecked", not "known to differ". */
function SourceVerificationNote({ verified }: { verified: boolean }) {
  const learnMore = (
    <Link href={SV_MVR_PAGE} className="text-content-accent underline">
      here
    </Link>
  );
  return (
    <Text
      as="p"
      kind="paragraph"
      size="paragraph-xs"
      className="text-content-tertiary"
    >
      {!verified && (
        <>
          Lack of verification does not necessarily mean the linked source is
          different from the on-chain bytecode, only that it hasn&apos;t been
          checked.{" "}
        </>
      )}
      Click {learnMore} to learn more about source verification.
    </Text>
  );
}

/** The attested facts, shown when the "Verified" header is expanded. Copy
 *  buttons carry the full value even though the row shows a short form. The
 *  "Attestation" row links to the attestation object itself, so the claim can
 *  be checked on-chain rather than taken on faith. */
function VerificationDetail({
  v,
  network,
}: {
  v: SourceVerification;
  network: "mainnet" | "testnet";
}) {
  return (
    <>
      <DetailRow label="Verified by" value={v.verifier.name} />
      <DetailRow label="Commit" value={shortSha(v.gitSha)} copy={v.gitSha} mono />
      {v.subdir && <DetailRow label="Subdirectory" value={v.subdir} mono />}
      {v.toolchainVersion && (
        <DetailRow label="Toolchain" value={v.toolchainVersion} mono />
      )}
      {v.sourceHash && (
        <DetailRow
          label="Source hash"
          value={shortSha(v.sourceHash)}
          copy={v.sourceHash}
          mono
        />
      )}
      <DetailRow
        label="Attestation"
        mono
        copy={v.id}
        value={
          <ExplorerLink network={network} type="object" idOrHash={v.id}>
            {truncateId(v.id)}
          </ExplorerLink>
        }
      />
    </>
  );
}

/** Deep link to the exact source a package version came from: the resolved commit
 *  plus the package subdirectory on github.com. Returns undefined (caller falls
 *  back to the bare repository URL) until the commit resolves or off GitHub. Uses
 *  the commit, not the tag, so a slashed tag can't break the tree path and a later
 *  tag move can't repoint an existing link. */
function sourceTreeUrl(
  gitInfo: { repository_url: string; path: string } | null | undefined,
  commit: string | null | undefined,
): string | undefined {
  if (!gitInfo || !commit) return undefined;
  const repo = parseGithubRepo(gitInfo.repository_url);
  if (!repo) return undefined;
  const sub = gitInfo.path.replace(/^\/+|\/+$/g, "");
  return `https://github.com/${repo.owner}/${repo.repo}/tree/${commit}${sub ? `/${sub}` : ""}`;
}

/** GitHub commit URL for a verified commit, or undefined when the repo isn't on
 *  github.com (the only host we can deep-link). */
function commitUrl(repoUrl: string, sha: string): string | undefined {
  const repo = parseGithubRepo(repoUrl);
  return repo ? `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}` : undefined;
}

/** GitHub compare URL from a verified commit (`from`) to the current one (`to`),
 *  or undefined unless the attestation's repo and the name's repo resolve to the
 *  *same* github.com repo. A `/compare` needs both commits in one repo, and
 *  GitHub is the only host we can link a diff for, so a cross-repo or non-GitHub
 *  attestation yields no link. `.git` suffixes are normalized by
 *  `parseGithubRepo`, so they never cause a spurious mismatch. */
function compareUrl(
  attestationRepoUrl: string,
  nameRepoUrl: string,
  from: string,
  to: string,
): string | undefined {
  const a = parseGithubRepo(attestationRepoUrl);
  const b = parseGithubRepo(nameRepoUrl);
  if (!a || !b || a.owner !== b.owner || a.repo !== b.repo) return undefined;
  return `https://github.com/${a.owner}/${a.repo}/compare/${from}...${to}`;
}

/** Shown under an *unverified* header when the package has source-verification
 *  attestations for commits other than the one the tag currently resolves to —
 *  the common "verified, then bumped the tag for a docs edit" case. Each row
 *  links the verified commit and, when its attestation and the name share a
 *  GitHub repo, a diff from it to the current commit. Hidden until the header is
 *  expanded, like the rest of the detail. */
function VerifiedCommits({
  verifications,
  repoUrl,
  currentCommit,
}: {
  verifications: SourceVerification[];
  repoUrl: string;
  currentCommit: string;
}) {
  return (
    <>
      <Text
        as="p"
        kind="paragraph"
        size="paragraph-xs"
        className="text-content-tertiary"
      >
        The linked source code has not been verified, but other versions have:
      </Text>
      <ul className="ml-xs flex list-inside list-disc flex-col gap-2xs marker:text-content-tertiary">
        {verifications.map((v) => {
          const commit = commitUrl(v.gitUrl, v.gitSha);
          const diff = compareUrl(v.gitUrl, repoUrl, v.gitSha, currentCommit);
          return (
            <li key={v.id}>
              <Text
                as="span"
                kind="paragraph"
                size="paragraph-xs"
                className="text-content-tertiary"
              >
                commit{" "}
                <span className="font-mono">
                  {commit ? (
                    <a
                      href={commit}
                      target="_blank"
                      rel="noreferrer"
                      className="text-content-accent underline"
                    >
                      {shortSha(v.gitSha)}
                    </a>
                  ) : (
                    <span className="text-content-secondary">
                      {shortSha(v.gitSha)}
                    </span>
                  )}
                </span>
                {diff && (
                  <>
                    {" "}(
                    <a
                      href={diff}
                      target="_blank"
                      rel="noreferrer"
                      className="text-content-accent underline"
                    >
                      diff
                    </a>
                    )
                  </>
                )}
              </Text>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function DetailRow({
  label,
  value,
  copy,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  copy?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-sm">
      <Text
        as="span"
        kind="label"
        size="label-xs"
        className="shrink-0 normal-case text-content-tertiary"
      >
        {label}
      </Text>
      <span className="flex min-w-0 items-center gap-2xs">
        <Text
          as="span"
          kind="paragraph"
          size="paragraph-xs"
          className={`min-w-0 truncate text-content-secondary ${mono ? "font-mono" : ""}`}
        >
          {value}
        </Text>
        {copy && <CopyBtn text={copy} size="sm" />}
      </span>
    </div>
  );
}
