import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";

/** The `git_info` shape carried on a resolved MVR name. */
export interface GitInfo {
  repository_url: string;
  path: string;
  tag: string;
}

/** owner/repo parsed from a GitHub repository URL, or undefined if it isn't one.
 *  The source verifier only handles GitHub today, so a non-GitHub `git_info`
 *  simply yields no resolution (and therefore no verified badge). */
export function parseGithubRepo(url: string): { owner: string; repo: string } | undefined {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  if (u.host !== "github.com") return undefined;
  const parts = u.pathname.replace(/\.git$/, "").split("/").filter(Boolean);
  if (parts.length < 2) return undefined;
  return { owner: parts[0]!, repo: parts[1]! };
}

/**
 * Resolve the commit that a resolved name's `git_info` link points at — the
 * *displayed* source, which is what a source-verification claim must match. Uses
 * GitHub's `/commits/{ref}` with the `.sha` media type, which returns the bare
 * commit and dereferences annotated tags to their commit (so a tag object never
 * leaks through, unlike a naive `ls-remote`).
 *
 * Returns `null` when the ref can't be resolved (missing/private/non-GitHub, or
 * a moved-away tag), which the caller treats as "not verified".
 *
 * Note: unauthenticated GitHub API calls are rate-limited (60/hr per IP); fine
 * for browsing, but a heavily-trafficked deploy would want a token or a proxy.
 */
export function useResolveGitCommit(gitInfo: GitInfo | null | undefined) {
  const repo = gitInfo ? parseGithubRepo(gitInfo.repository_url) : undefined;
  const tag = gitInfo?.tag;

  return useQuery({
    queryKey: [AppQueryKeys.RESOLVE_GIT_COMMIT, repo?.owner, repo?.repo, tag],
    enabled: !!repo && !!tag,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      // The ref may contain slashes (e.g. `testnet/v1`); GitHub wants them raw,
      // so encode each segment but keep the separators.
      const ref = tag!.split("/").map(encodeURIComponent).join("/");
      const res = await fetch(
        `https://api.github.com/repos/${repo!.owner}/${repo!.repo}/commits/${ref}`,
        { headers: { Accept: "application/vnd.github.sha" } },
      );
      if (!res.ok) return null;
      return (await res.text()).trim();
    },
  });
}
