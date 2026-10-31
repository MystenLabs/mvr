import { beforeEach, describe, expect, it, vi } from "vitest";
import { bcs } from "@mysten/sui/bcs";
import { deriveObjectID, normalizeSuiAddress } from "@mysten/sui/utils";
import type { SuiClientTypes } from "@mysten/sui/client";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import {
  byPublishedAtDesc,
  subjectAddress,
  toAttestationInfo,
  type AttestationConfig,
  type ResolvedAttestor,
} from "@/lib/attestations";
import {
  fetchTrustedAttestations,
  fetchRevokedAttestations,
  useIssuedAttestations,
  type IssuedAttestation,
} from "@/hooks/useGetAttestations";
import {
  useSourceVerification,
  type SourceVerification,
} from "@/hooks/useSourceVerification";

const mocks = vi.hoisted(() => ({
  listOwnedObjects: vi.fn(),
  getObject: vi.fn(),
  query: vi.fn(),
  attestationConfig: vi.fn(),
  useTrustedAttestors: vi.fn(),
  useGetMvrVersionAddresses: vi.fn(),
}));
vi.mock("@/components/providers/client-provider", () => ({
  useSuiClientsContext: () => ({
    testnet: { core: mocks },
    graphql: { testnet: { query: mocks.query } },
  }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => options,
}));
vi.mock("@/lib/attestations", async (original) => ({
  ...(await original<typeof import("@/lib/attestations")>()),
  attestationConfig: mocks.attestationConfig,
}));
vi.mock("@/hooks/useTrustedAttestors", () => ({
  useTrustedAttestors: mocks.useTrustedAttestors,
}));
vi.mock("@/hooks/useGetMvrVersionAddresses", async (original) => ({
  ...(await original<typeof import("@/hooks/useGetMvrVersionAddresses")>()),
  useGetMvrVersionAddresses: mocks.useGetMvrVersionAddresses,
}));

const subject = normalizeSuiAddress("0x42");
const attestor: ResolvedAttestor = {
  name: "Auditor",
  originalId: normalizeSuiAddress("0xa"),
  lineage: [normalizeSuiAddress("0xa"), normalizeSuiAddress("0xb")],
};
const cfg: AttestationConfig = {
  registryPkg: normalizeSuiAddress("0xc"),
  registryId: normalizeSuiAddress("0xd"),
  trustedAttestors: [attestor],
};
const owner = deriveObjectID(
  cfg.registryId,
  "0x2::object::ID",
  bcs.Address.serialize(subject).toBytes(),
);
const client = { core: mocks } as unknown as SuiGrpcClient;
type Object = SuiClientTypes.Object<{ display: true; json: true }>;

function object(
  id: string,
  revokedAt: unknown = null,
  pkg = attestor.originalId,
): Object {
  return {
    objectId: normalizeSuiAddress(id),
    version: "1",
    digest: "test",
    type: `${cfg.registryPkg}::attestations::Attestation<${pkg}::audit::Audit>`,
    owner: { $kind: "AddressOwner", AddressOwner: owner },
    content: undefined,
    previousTransaction: undefined,
    objectBcs: undefined,
    display: { output: { name: "Audit" }, errors: null },
    json: {
      subject,
      revoked_at_ms: revokedAt,
      data: {
        git_url: "https://example.com/repo.git",
        git_sha: "abc123",
        subdir: "",
      },
    },
  };
}

function queryFunction<T>(result: unknown): () => Promise<T> {
  return (result as { queryFn: () => Promise<T> }).queryFn;
}

function serve(objects: Object[]) {
  mocks.listOwnedObjects.mockImplementation(async (options) => {
    expect(options.include).toMatchObject({ json: true, display: true });
    if (options.owner !== owner)
      return { objects: [], hasNextPage: false, cursor: null };
    const index = Number(options.cursor ?? 0);
    return {
      objects: objects.slice(index, index + 1),
      hasNextPage: index + 1 < objects.length,
      cursor: String(index + 1),
    };
  });
  mocks.getObject.mockImplementation(async ({ objectId, include }) => {
    expect(include).toMatchObject({ json: true, display: true });
    return { object: objects.find((o) => o.objectId === objectId) };
  });
  mocks.query.mockImplementation(async ({ query, variables }) => {
    if (query.includes("packageVersions"))
      return {
        data: {
          packageVersions: {
            nodes: attestor.lineage.map((address, index) => ({
              address,
              version: index + 1,
            })),
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      };
    if (query.includes("asMovePackage"))
      return {
        data: {
          object: {
            asMovePackage: {
              modules: {
                nodes: [
                  {
                    name: "audit",
                    datatypes: {
                      nodes: [
                        {
                          name: "Audit",
                          asMoveStruct: { abilities: ["STORE"] },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      };
    const matches = objects.filter(
      (o) =>
        o.type === variables.type &&
        (!variables.owner || variables.owner === owner),
    );
    const index = Number(variables.after ?? 0);
    return {
      data: {
        objects: {
          nodes: matches.slice(index, index + 1).map((o) => ({
            address: o.objectId,
            asMoveObject: { contents: { json: o.json } },
          })),
          pageInfo: {
            hasNextPage: index + 1 < matches.length,
            endCursor: String(index + 1),
          },
        },
      },
    };
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.attestationConfig.mockReturnValue(cfg);
  mocks.useTrustedAttestors.mockReturnValue({ attestors: [attestor] });
  mocks.useGetMvrVersionAddresses.mockReturnValue({
    data: [{ address: attestor.originalId }],
  });
});

describe("v2 attestation reads", () => {
  it("derives one owner using the subject ID, independent of the registry package", () => {
    expect(subjectAddress(cfg.registryId, subject)).toBe(owner);
  });

  it.each([null, "0", "1750000000000"])(
    "parses revocation timestamp %s",
    (timestamp) => {
      expect(
        toAttestationInfo(object("0x1", timestamp), cfg.registryPkg)?.revoked,
      ).toBe(timestamp !== null);
    },
  );

  it.each([
    undefined,
    false,
    "",
    "not-a-timestamp",
    "-1",
    "18446744073709551616",
    [],
    { vec: [] },
  ])("rejects a malformed or missing revocation value: %j", (timestamp) => {
    const candidate = object("0x1");
    candidate.json!.revoked_at_ms = timestamp;
    expect(() => toAttestationInfo(candidate, cfg.registryPkg)).toThrow(
      /revocation/i,
    );
  });

  it("rejects a lookalike wrapper from another registry package", () => {
    const candidate = object("0x1");
    candidate.type = candidate.type.replace(
      cfg.registryPkg,
      normalizeSuiAddress("0x99"),
    );
    expect(toAttestationInfo(candidate, cfg.registryPkg)).toBeNull();
  });

  it("splits active and revoked records at one owner across pages", async () => {
    const hidden = object("0x4");
    hidden.display = null;
    serve([
      object("0x1"),
      object("0x2", "0"),
      object("0x3", null, normalizeSuiAddress("0xee")),
      hidden,
      object("0x5", null, attestor.lineage[1]),
    ]);
    const live = await fetchTrustedAttestations(
      client,
      cfg,
      [attestor],
      subject,
    );
    const revoked = await fetchRevokedAttestations(
      client,
      cfg,
      [attestor],
      subject,
    );
    expect(live.map((a) => a.info.id)).toEqual([
      normalizeSuiAddress("0x1"),
      normalizeSuiAddress("0x5"),
    ]);
    expect(revoked.map((a) => a.info.id)).toEqual([normalizeSuiAddress("0x2")]);
  });

  it("keeps source-verification claims out of the Security audit list", async () => {
    serve([object("0x1"), object("0x2", "0")]);
    const verifier: ResolvedAttestor = {
      ...attestor,
      role: "source-verification",
    };
    expect(
      await fetchTrustedAttestations(client, cfg, [verifier], subject),
    ).toEqual([]);
    expect(
      await fetchRevokedAttestations(client, cfg, [verifier], subject),
    ).toEqual([]);
  });

  it("surfaces malformed status instead of reporting a live audit", async () => {
    const candidate = object("0x1");
    delete candidate.json!.revoked_at_ms;
    serve([candidate]);
    await expect(
      fetchTrustedAttestations(client, cfg, [attestor], subject),
    ).rejects.toThrow(/revocation/i);
  });

  it("reads Issued revocation from current JSON despite stale GraphQL state", async () => {
    serve([object("0x1"), object("0x2")]);
    mocks.getObject.mockImplementation(async ({ objectId, include }) => {
      expect(include).toMatchObject({ json: true, display: true });
      return {
        object: object(
          objectId,
          objectId === normalizeSuiAddress("0x2") ? "1750000000000" : null,
        ),
      };
    });
    const run = queryFunction<{ items: IssuedAttestation[]; failures: number }>(
      useIssuedAttestations(
        {
          name: "@auditor/audit",
          version: 1,
          package_address: attestor.originalId,
        } as Parameters<typeof useIssuedAttestations>[0],
        "testnet",
      ),
    );
    const result = await run();
    expect(result.items.map((a) => a.revoked)).toEqual([false, true]);
    expect(result.failures).toBe(0);
  });

  it("finds original schemas even when the MVR versions page omits older releases", async () => {
    serve([object("0x1")]);
    mocks.useGetMvrVersionAddresses.mockReturnValue({
      data: [{ address: attestor.lineage[1], version: 6 }],
    });
    const run = queryFunction<{ items: IssuedAttestation[]; failures: number }>(
      useIssuedAttestations(
        {
          name: "@auditor/audit",
          version: 6,
          package_address: attestor.lineage[1],
        } as Parameters<typeof useIssuedAttestations>[0],
        "testnet",
      ),
    );
    expect((await run()).items).toHaveLength(1);
  });

  it("counts unreadable Issued status as a per-object failure", async () => {
    const candidate = object("0x1");
    delete candidate.json!.revoked_at_ms;
    serve([candidate, object("0x2")]);
    const run = queryFunction<{ items: IssuedAttestation[]; failures: number }>(
      useIssuedAttestations(
        {
          name: "@auditor/audit",
          version: 1,
          package_address: attestor.originalId,
        } as Parameters<typeof useIssuedAttestations>[0],
        "testnet",
      ),
    );
    const result = await run();
    expect(result.items).toHaveLength(1);
    expect(result.failures).toBe(1);
  });

  it("excludes revoked source verification while retaining live claims", async () => {
    serve([object("0x1"), object("0x2", "0")]);
    mocks.useTrustedAttestors.mockReturnValue({
      attestors: [{ ...attestor, role: "source-verification" }],
    });
    const result = await queryFunction<SourceVerification[]>(
      useSourceVerification(subject, "testnet"),
    )();
    expect(result.map((a) => a.id)).toEqual([normalizeSuiAddress("0x1")]);
  });

  it("surfaces missing source-verification status instead of trusting it", async () => {
    const candidate = object("0x1");
    delete candidate.json!.revoked_at_ms;
    serve([candidate]);
    mocks.useTrustedAttestors.mockReturnValue({
      attestors: [{ ...attestor, role: "source-verification" }],
    });
    await expect(
      queryFunction<SourceVerification[]>(
        useSourceVerification(subject, "testnet"),
      )(),
    ).rejects.toThrow(/revocation/i);
  });
});

describe("byPublishedAtDesc", () => {
  const at = (id: string, published_at?: unknown) => ({
    info: {
      id,
      innerType: "0x1::audit::Audit",
      revoked: false,
      display: published_at === undefined ? {} : { published_at },
    },
  });

  it("orders newest published_at first and undated attestations last", () => {
    const items = [
      at("undated"),
      at("2025", "2025-03-01T00:00:00.000Z"),
      at("garbage", "not a date"),
      at("2026", "2026-10-26T17:41:34.279Z"),
      at("2024", "2024-12-31T23:59:59.000Z"),
    ];
    expect(items.sort(byPublishedAtDesc).map((i) => i.info.id)).toEqual([
      "2026",
      "2025",
      "2024",
      "undated",
      "garbage",
    ]);
  });
});
