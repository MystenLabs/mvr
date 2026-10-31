import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it, vi } from "vitest";
import checkedInConfig from "@/lib/attestation-config.json";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("trusts the demo auditor on both networks and Asymptotic on testnet", () => {
  expect(checkedInConfig).toEqual({
    testnet: {
      registryPkg:
        "0x754da52dba4429dc141b4298c5afebb4697d7ff74a15580c0f3074f3f33f79e5",
      registryId:
        "0x333d2e0d4eba57451e942bfc1ebffd0d4daf599ff719bab556e2882109df4db3",
      trustedAttestors: [
        {
          originalId:
            "0x1b3a65bc3eb8c2268329a2e91e3b87fc081516676efa6e3361c0d278782a371a",
          name: "Demo auditor (not a security auditor)",
          mvrName: "@pkg/attestations-demo",
        },
        {
          originalId:
            "0x8f8adc04b11672e2e0f1fc05f31eae8e5b50a14efbb22e9cc4229d532e48e0cb",
          name: "Asymptotic",
          iconUrl: "https://asymptotic.tech/favicon.svg",
        },
      ],
    },
    mainnet: {
      registryPkg:
        "0xf918b2fc17085f4e48021be94ee43f9cc4437256acfd085f1e3d1a54d11f6e7b",
      registryId:
        "0x86875cdb65149c3a1c9653486c09ef7846a751823bb2a96d434fd01fbd4b052e",
      trustedAttestors: [
        {
          originalId:
            "0x70b5189985e476f8f2e6f014ed9e2e6aeee71f4cafb07b768c3a7c7467e0e793",
          name: "Demo auditor (not a security auditor)",
          mvrName: "@pkg/attestations-demo",
        },
      ],
    },
  });
});

it("enables demo attestations on testnet and mainnet", async () => {
  vi.stubEnv("NEXT_PUBLIC_ATTESTATION_CONFIG", "");
  const { attestationConfig } = await import("@/lib/attestations");
  expect(attestationConfig("testnet")).toEqual(checkedInConfig.testnet);
  expect(attestationConfig("mainnet")).toEqual(checkedInConfig.mainnet);
});

it("lists an attester once when one MVR name spans networks", async () => {
  vi.stubEnv("NEXT_PUBLIC_ATTESTATION_CONFIG", "");
  const { allTrustedAttestors } = await import("@/lib/attestations");
  expect(allTrustedAttestors()).toEqual(
    checkedInConfig.testnet.trustedAttestors,
  );
});

it("lists unnamed attesters by package ID", async () => {
  vi.stubEnv(
    "NEXT_PUBLIC_ATTESTATION_CONFIG",
    JSON.stringify({
      testnet: {
        ...checkedInConfig.testnet,
        trustedAttestors: [
          { name: "A", originalId: "0x5" },
          { name: "A again", originalId: "0x05" },
          { name: "B", originalId: "0x6" },
        ],
      },
    }),
  );
  const { allTrustedAttestors } = await import("@/lib/attestations");
  expect(allTrustedAttestors().map((a) => a.name)).toEqual(["A", "B"]);
});

it("lets the environment override replace the checked-in configuration", async () => {
  vi.stubEnv("NEXT_PUBLIC_ATTESTATION_CONFIG", "{}");
  const { attestationConfig, allTrustedAttestors } = await import(
    "@/lib/attestations"
  );
  expect(attestationConfig("testnet")).toBeNull();
  expect(attestationConfig("mainnet")).toBeNull();
  expect(allTrustedAttestors()).toEqual([]);
});

it("disables attestations when the override has no trusted attesters", async () => {
  vi.stubEnv(
    "NEXT_PUBLIC_ATTESTATION_CONFIG",
    JSON.stringify({
      testnet: { ...checkedInConfig.testnet, trustedAttestors: [] },
    }),
  );
  const { attestationConfig, allTrustedAttestors } = await import(
    "@/lib/attestations"
  );
  expect(attestationConfig("testnet")).toBeNull();
  expect(allTrustedAttestors()).toEqual([]);
});

it("generates both local network configs from the current demo handoff", () => {
  const root = mkdtempSync(join(tmpdir(), "mvr-attestation-env-"));
  try {
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, "app"));
    const script = join(root, "scripts/write-demo-env.sh");
    copyFileSync(
      fileURLToPath(
        new URL("../../scripts/write-demo-env.sh", import.meta.url),
      ),
      script,
    );
    const ids = {
      registryId: "0x1",
      attestationRegistryPkg: "0x2",
      subjects: { subject: "0x3", dependency: "0x4" },
      dependencyVersions: [{ version: 1, address: "0x4" }],
      trustedAttestors: [
        { name: "auditor_a", originalId: "0x5", latestId: "0x6" },
      ],
    };
    const input = join(root, "demo-ids.json");
    writeFileSync(input, JSON.stringify(ids));
    execFileSync("bash", [script, input], {
      env: {
        ...process.env,
        RPC_URL: "http://127.0.0.1:19000",
        GRAPHQL_URL: "http://127.0.0.1:19125/graphql",
      },
    });
    const env = readFileSync(join(root, "app/.env"), "utf8");
    const configLine = env
      .split("\n")
      .find((line) => line.startsWith("NEXT_PUBLIC_ATTESTATION_CONFIG="))!;
    const config = JSON.parse(
      configLine.slice(configLine.indexOf("=") + 1).slice(1, -1),
    );
    expect(config.mainnet).toEqual(config.testnet);
    expect(config.testnet).toMatchObject({
      registryId: "0x1",
      registryPkg: "0x2",
      trustedAttestors: [{ originalId: "0x5" }],
    });
    expect(config.testnet.trustedAttestors[0]).not.toHaveProperty("lineage");
    expect(env).toContain('NEXT_PUBLIC_LOCAL_RPC_URL="http://127.0.0.1:19000"');
    expect(env).toContain(
      'NEXT_PUBLIC_LOCAL_GRAPHQL="http://127.0.0.1:19125/graphql"',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
