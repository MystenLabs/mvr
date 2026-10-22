import { beforeEach, expect, it, vi } from "vitest";
import { useResolvePackageByAddress } from "@/hooks/useResolvePackageByAddress";
import { useGetMvrVersionAddresses } from "@/hooks/useGetMvrVersionAddresses";

const query = vi.hoisted(() => vi.fn());
vi.mock("@/components/providers/client-provider", () => ({
  useSuiClientsContext: () => ({ graphql: { testnet: { query } } }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => options,
  useInfiniteQuery: (options: unknown) => options,
}));
const address = `0x${"a".repeat(64)}`;
function options<T>(value: unknown): T {
  return value as T;
}
beforeEach(() => {
  query.mockReset();
});

it("reads a package's version directly rather than guessing from the first 50 versions", async () => {
  query.mockResolvedValue({
    data: {
      object: { asMovePackage: { address, version: 51 } },
      packageVersions: {
        nodes: [{ address: `0x${"b".repeat(64)}`, version: 1 }],
      },
    },
  });
  const result = await options<{ queryFn: () => Promise<{ version: number }> }>(
    useResolvePackageByAddress(address, "testnet"),
  ).queryFn();
  expect(result.version).toBe(51);
});

it("surfaces GraphQL resolution errors rather than treating them as not-found", async () => {
  query.mockResolvedValue({ errors: [{ message: "Indexer unavailable" }] });
  await expect(
    options<{ queryFn: () => Promise<unknown> }>(
      useResolvePackageByAddress(address, "testnet"),
    ).queryFn(),
  ).rejects.toThrow("Indexer unavailable");
});

it("loads every page of a nameless package's versions", async () => {
  query.mockImplementation(async ({ variables }) => ({
    data: {
      packageVersions: variables.after
        ? {
            nodes: [{ address, version: 51 }],
            pageInfo: { hasNextPage: false, endCursor: null },
          }
        : {
            nodes: [{ address: "0x1", version: 1 }],
            pageInfo: { hasNextPage: true, endCursor: "next" },
          },
    },
  }));
  const opts = options<{
    queryFn: (context: {
      pageParam: number;
    }) => Promise<{ address: string; version: number }[]>;
    getNextPageParam: (page: { address: string; version: number }[]) => unknown;
  }>(useGetMvrVersionAddresses(address, 51, "testnet"));
  const result = await opts.queryFn({ pageParam: 51 });
  expect(result.map((v) => v.version)).toEqual([51, 1]);
  expect(opts.getNextPageParam(result)).toBeUndefined();
});

it("surfaces version enumeration failures rather than returning an empty list", async () => {
  query.mockResolvedValue({ errors: [{ message: "Indexer unavailable" }] });
  const opts = options<{
    queryFn: (context: { pageParam: number }) => Promise<unknown>;
  }>(useGetMvrVersionAddresses(address, 1, "testnet"));
  await expect(opts.queryFn({ pageParam: 1 })).rejects.toThrow(
    "Indexer unavailable",
  );
});
