import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { SourceCodeSection } from "@/components/single-package/SourceCodeSection";
import type { ResolvedName } from "@/hooks/mvrResolution";
import type { SourceVerification } from "@/hooks/useSourceVerification";

const state = vi.hoisted(() => ({
  commit: "a".repeat(40),
  claims: [] as SourceVerification[],
}));
vi.mock("@/hooks/useResolveGitCommit", async (original) => ({
  ...(await original<typeof import("@/hooks/useResolveGitCommit")>()),
  useResolveGitCommit: () => ({ data: state.commit }),
}));
vi.mock("@/hooks/useSourceVerification", () => ({
  useSourceVerification: () => ({ data: state.claims }),
}));
const name: ResolvedName = {
  name: "@example/package",
  package_address: "0x42",
  version: 1,
  metadata: {},
  package_info: null,
  git_info: {
    repository_url: "https://github.com/example/repo",
    path: "packages/subject",
    tag: "v1",
  },
};
function render() {
  return renderToStaticMarkup(
    createElement(SourceCodeSection, {
      name,
      href: name.git_info!.repository_url,
      network: "testnet",
    }),
  );
}
beforeEach(() => {
  state.claims = [
    {
      id: "0x1",
      verifier: { name: "Verifier", originalId: "0x2" },
      gitUrl: name.git_info!.repository_url,
      gitSha: state.commit,
      subdir: name.git_info!.path,
    },
  ];
});
it("verifies a claim for the same repository, directory, and commit", () => {
  expect(render()).toContain("Verified source code");
});
it("does not verify another package directory at the same commit", () => {
  state.claims[0]!.subdir = "packages/other";
  expect(render()).toContain("Unverified source code");
});
it("does not verify another repository with the same commit", () => {
  state.claims[0]!.gitUrl = "https://github.com/another/fork";
  expect(render()).toContain("Unverified source code");
});
it("normalizes GitHub casing, .git, and relative directory notation", () => {
  state.claims[0]!.gitUrl = "https://github.com/EXAMPLE/REPO.git";
  state.claims[0]!.subdir = "./packages/subject/";
  expect(render()).toContain("Verified source code");
});
