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

it("records the new testnet registry without trusting any attesters", () => {
  expect(checkedInConfig).toEqual({
    testnet: {
      registryPkg:
        "0x754da52dba4429dc141b4298c5afebb4697d7ff74a15580c0f3074f3f33f79e5",
      registryId:
        "0x333d2e0d4eba57451e942bfc1ebffd0d4daf599ff719bab556e2882109df4db3",
      trustedAttestors: [],
    },
  });
});

it("keeps public networks disabled until trusted attesters are configured", async () => {
  vi.stubEnv("NEXT_PUBLIC_ATTESTATION_CONFIG", "");
  const { attestationConfig, allTrustedAttestors } = await import(
    "@/lib/attestations"
  );
  expect(attestationConfig("testnet")).toBeNull();
  expect(attestationConfig("mainnet")).toBeNull();
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
