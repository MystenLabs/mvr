import { useGetSourceFromGit } from "@/hooks/useGetSourceFromGit";
import LoadingState from "../LoadingState";
import { MarkdownRenderer } from "../ui/markdown-renderer";
import { ResolvedName } from "@/hooks/mvrResolution";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";
import { useEffect } from "react";

export function ReadMeRenderer({ name }: { name: ResolvedName }) {
  const { data: readme, isLoading } = useGetSourceFromGit({
    url: name.git_info?.repository_url,
    subPath: name.git_info?.path,
    tagOrHash: name.git_info?.tag,
    file: "README.md",
  });

  // Handle scrolling to the ID 
  useEffect(() => {
    setTimeout(() => {
      const id = window.location.hash?.replace("#", "");
      if (!id) return;

      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [readme]);

  if (isLoading)
    return <LoadingState size="sm" title="" description="Loading..." />;

  if (!readme)
    return <EmptyState {...Content.emptyStates.noReadMe} size="sm" />;

  return <MarkdownRenderer markdown={readme ?? ""} />;
}
