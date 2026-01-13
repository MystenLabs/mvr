import { NoRefetching } from "@/lib/utils";
import { AppQueryKeys, Network } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import { parse } from "smol-toml";

enum GitProvider {
  Github = "Github",
  Gitlab = "Gitlab",
  Bitbucket = "Bitbucket",
}

const GitProviderUrls = {
  [GitProvider.Github]: "github.com",
  [GitProvider.Gitlab]: "gitlab.com",
  [GitProvider.Bitbucket]: "bitbucket.org",
};

export type EnvironmentResult = {
  publishedAt: string;
  originalId: string;
  version: number;
}

export const parseEnvironmentsFromLockfile = (
  lockfile: string,
  network: Network,
): EnvironmentResult => {
  const file = parse(lockfile);
  if (!file.env) throw new Error("Environment is missing from the lockfile");
  const env = file.env as Record<string, any>;
  if (!env[network])
    throw new Error(`Network ${network} is missing from the lockfile`);

  return {
    publishedAt: env[network]["latest-published-id"],
    originalId: env[network]["original-published-id"],
    version: +env[network]["published-version"],
  }
};

export const parseEnvironmentsFromPublicationFile = (
  publicationFile: string,
  network: Network,
): EnvironmentResult => {
  const file = parse(publicationFile);
  if (!file.published) throw new Error("Published is missing from the publication file");
  let env = file.published as Record<string, any>;

  if (!env[network]) throw new Error(`Network ${network} is missing from the publication file`);

  return {
    publishedAt: env[network]["published-at"],
    originalId: env[network]["original-id"],
    version: +env[network]["version"],
  };
};

const GithubUrl = (props: {
  owner: string;
  repository: string;
  tagOrHash: string;
  subPath: string;
  file: string;
  provider: GitProvider;
}) => {
  if (props.provider === GitProvider.Github) {
    return `https://raw.githubusercontent.com/${props.owner}/${props.repository}/${props.tagOrHash}/${props.subPath ? `${props.subPath}/` : ""}${props.file}`;
  }

  if (props.provider === GitProvider.Gitlab) {
    return `https://gitlab.com/${props.owner}/${props.repository}/-/raw/${props.tagOrHash}/${props.subPath ? `${props.subPath}/` : ""}${props.file}`;
  }

  if (props.provider === GitProvider.Bitbucket) {
    return `https://bitbucket.org/${props.owner}/${props.repository}/raw/${props.tagOrHash}/${props.subPath ? `${props.subPath}/` : ""}${props.file}`;
  }

  throw new Error("Invalid Git Provider");
};

const parseGitUrl = (url: string) => {
  const [provider, owner, repo] = url.replace("://", "").split("/");

  if (provider?.includes(GitProviderUrls[GitProvider.Github])) {
    return { owner, repo, provider: GitProvider.Github };
  }
  if (provider?.includes(GitProviderUrls[GitProvider.Gitlab])) {
    return { owner, repo, provider: GitProvider.Gitlab };
  }
  if (provider?.includes(GitProviderUrls[GitProvider.Bitbucket])) {
    return { owner, repo, provider: GitProvider.Bitbucket };
  }

  throw new Error("Invalid Git Provider");
};

// Remove `.git` from the URL, to make the raw URLs valid.
const formatGitUrl = (url: string) => {
  if (url.endsWith(".git")) return url.slice(0, -4);
  return url;
};

export const querySource = async ({
  url,
  subPath,
  tagOrHash,
  file = "Move.lock",
}: {
  url: string;
  subPath: string;
  tagOrHash: string;
  file?: string;
}) => {
  const { provider, repo, owner } = parseGitUrl(formatGitUrl(url));

  if (!provider || !repo || !owner) throw new Error("Invalid URL");

  const gitUrl = GithubUrl({
    owner,
    repository: repo,
    tagOrHash,
    subPath,
    file,
    provider,
  });

  const response = await fetch(gitUrl);

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  return response.text();
};

export function useGetSourceFromGit({
  url,
  subPath,
  tagOrHash,
  file = "Move.lock",
}: {
  url?: string;
  subPath?: string;
  tagOrHash?: string;
  file?: string;
}) {
  return useQuery({
    queryKey: [AppQueryKeys.GIT_SOURCE, url, subPath, tagOrHash, file],
    queryFn: async () => {
      if (!url || !tagOrHash) throw new Error("Invalid URL");

      return querySource({
        url: formatGitUrl(url),
        subPath: subPath || "",
        tagOrHash,
        file,
      });
    },

    enabled: !!url && !!tagOrHash,
    ...NoRefetching,
    gcTime: Infinity,
    retry: false,
  });
}
