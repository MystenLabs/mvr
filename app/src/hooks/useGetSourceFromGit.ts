import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";

enum GitProvider { 
    Github = 'Github',
    Gitlab = 'Gitlab',
    Bitbucket = 'Bitbucket'
};

const GitProviderUrls = {
    [GitProvider.Github]: "github.com",
    [GitProvider.Gitlab]: "gitlab.com",
    [GitProvider.Bitbucket]: "bitbucket.org"
}

const GithubUrl = (props: {owner: string; repository: string; tagOrHash: string, subPath: string; file: string, provider: GitProvider }) =>  {
    if (props.provider === GitProvider.Github) {
        return `https://raw.githubusercontent.com/${props.owner}/${props.repository}/${props.tagOrHash}/${props.subPath ? `${props.subPath}/` : ""}${props.file}`;
    }

    if (props.provider === GitProvider.Gitlab) {
        return `https://gitlab.com/${props.owner}/${props.repository}/-/raw/${props.tagOrHash}/${props.subPath ? `${props.subPath}/` : ""}${props.file}`;
    }

    if (props.provider === GitProvider.Bitbucket) {
        return `https://bitbucket.org/${props.owner}/${props.repository}/raw/${props.tagOrHash}/${props.subPath ? `${props.subPath}/` : ""}${props.file}`;
    }

    throw new Error("Invalid Git Provider")
}

const parseGitUrl = (url: string) => {
    const [provider, owner, repo] = url.replace('://', '').split("/");

    console.log(provider, owner, repo);

    if (provider?.includes(GitProviderUrls[GitProvider.Github])) {
        return { owner, repo, provider: GitProvider.Github }
    }
    if (provider?.includes(GitProviderUrls[GitProvider.Gitlab])) {
        return { owner, repo, provider: GitProvider.Gitlab }
    }
    if (provider?.includes(GitProviderUrls[GitProvider.Bitbucket])) {
        return { owner, repo, provider: GitProvider.Bitbucket }
    }

    throw new Error("Invalid Git Provider")
}

export const querySource = async ({
    url,
    subPath,
    tagOrHash
}: {
    url: string,
    subPath: string,
    tagOrHash: string
}) => {
    console.log(url, subPath, tagOrHash);
    const {provider, repo, owner } = parseGitUrl(url);
    
    if (!provider || !repo || !owner)  throw new Error("Invalid URL");

    const response = await fetch(GithubUrl({owner, repository: repo, tagOrHash, subPath, file: "Move.lock" , provider}));

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
}

export function useGetSourceFromGit({
    url,
    subPath,
    tagOrHash
}: {
    url: string,
    subPath: string,
    tagOrHash: string
}) {
    return useQuery({
        queryKey: [AppQueryKeys.GIT_SOURCE, url, subPath, tagOrHash],
        queryFn: async () => {
            return querySource({url, subPath, tagOrHash});
        },

        enabled: !!url && !!tagOrHash && !!subPath,
        // aggressive caching since the source code is not expected to change
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: Infinity,
        gcTime: Infinity
    })
}
