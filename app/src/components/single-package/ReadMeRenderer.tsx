import { useGetSourceFromGit } from "@/hooks/useGetSourceFromGit";
import LoadingState from "../LoadingState";
import { MarkdownRenderer } from "../ui/markdown-renderer";
import { ResolvedName } from "@/hooks/mvrResolution";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";

export function ReadMeRenderer({ name }: { name: ResolvedName }) {
  const { data: readme, isLoading } = useGetSourceFromGit({
    url: name.git_info?.repository_url?.endsWith(".git")
      ? name.git_info?.repository_url?.slice(0, -4)
      : name.git_info?.repository_url,
    subPath: name.git_info?.path,
    tagOrHash: name.git_info?.tag,
    file: "README.md",
  });

  if (isLoading)
    return <LoadingState size="sm" title="" description="Loading..." />;

  if (!readme)
    return <EmptyState {...Content.emptyStates.noReadMe} size="sm" />;

  return <MarkdownRenderer markdown={readme ?? ""} />;
}
