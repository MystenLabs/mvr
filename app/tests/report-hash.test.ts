import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkReportHash,
  parseDigest,
  useReportHashCheck,
  MAX_REPORT_BYTES,
  type ReportHashCheck,
} from "@/hooks/useReportHashCheck";
import { ReportHash } from "@/components/single-package/SinglePackageTrustSignals";

const state = vi.hoisted(() => ({
  check: undefined as ReportHashCheck | undefined,
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQuery: (options: object) => ({ ...options, data: state.check }),
}));

const report = new TextEncoder().encode("audit report v1");
const hex = createHash("sha256").update(report).digest("hex");
const attested = `sha256:${hex}`;
const url = "https://auditor.example/report.pdf";

function serving(body: BodyInit | null, init?: ResponseInit) {
  return vi.fn(
    async () => new Response(body, init),
  ) as unknown as typeof fetch & {
    mock: { calls: [string, RequestInit][] };
  };
}

beforeEach(() => {
  state.check = undefined;
});

describe("parseDigest", () => {
  it("accepts an alg:hex digest the browser can recompute, case-insensitively", () => {
    expect(parseDigest(`SHA256:${hex.toUpperCase()}`)).toEqual({
      alg: "sha256",
      hex,
    });
    expect(parseDigest(`sha512:${"a".repeat(128)}`)?.alg).toBe("sha512");
  });

  it("leaves digests it can't recompute unchecked rather than guessing", () => {
    expect(parseDigest(hex)).toBeUndefined(); // bare value, no algorithm
    expect(parseDigest(`sha3-256:${hex}`)).toBeUndefined();
    expect(parseDigest(`blake2b256:${hex}`)).toBeUndefined();
    expect(parseDigest(`sha256:${hex.slice(2)}`)).toBeUndefined(); // wrong length
    expect(parseDigest(`sha256:${"z".repeat(64)}`)).toBeUndefined(); // not hex
  });
});

describe("checkReportHash", () => {
  it("matches a report whose bytes hash to the attested digest", async () => {
    const fetch = serving(report);
    expect(await checkReportHash(url, parseDigest(attested)!, fetch)).toEqual({
      status: "match",
    });
  });

  it("returns the served digest when the report has changed", async () => {
    const changed = new TextEncoder().encode("audit report v2");
    const result = await checkReportHash(
      url,
      parseDigest(attested)!,
      serving(changed),
    );
    expect(result).toEqual({
      status: "mismatch",
      actual: `sha256:${createHash("sha256").update(changed).digest("hex")}`,
    });
  });

  it("sends no cookies or referrer and bounds the request in time", async () => {
    const fetch = serving(report);
    await checkReportHash(url, parseDigest(attested)!, fetch);
    const [calledUrl, init] = fetch.mock.calls[0]!;
    expect(calledUrl).toBe(url);
    expect(init.credentials).toBe("omit");
    expect(init.referrerPolicy).toBe("no-referrer");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("is unverifiable, not mismatched, when the report can't be fetched", async () => {
    const blocked = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const result = await checkReportHash(url, parseDigest(attested)!, blocked);
    expect(result.status).toBe("unverifiable");

    const missing = await checkReportHash(
      url,
      parseDigest(attested)!,
      serving("", { status: 404 }),
    );
    expect(missing).toEqual({
      status: "unverifiable",
      reason: "the report link returned HTTP 404",
    });
  });

  it("refuses a report whose declared size is over the cap without reading it", async () => {
    const fetch = serving(report, {
      headers: { "content-length": String(MAX_REPORT_BYTES + 1) },
    });
    const result = await checkReportHash(url, parseDigest(attested)!, fetch);
    expect(result).toMatchObject({ status: "unverifiable" });
    expect((result as { reason: string }).reason).toMatch(/larger than/);
  });

  it("stops reading an undeclared, endless body once it passes the cap", async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let pulled = 0;
    let cancelled = false;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });
    const result = await checkReportHash(
      url,
      parseDigest(attested)!,
      serving(endless),
    );
    expect((result as { reason: string }).reason).toMatch(/larger than/);
    expect(cancelled).toBe(true);
    expect(pulled * chunk.byteLength).toBeLessThan(
      MAX_REPORT_BYTES + 4 * chunk.byteLength,
    );
  });
});

describe("useReportHashCheck", () => {
  // useQuery is mocked to echo its options, so `enabled` is readable here.
  const enabled = (...args: Parameters<typeof useReportHashCheck>) =>
    (useReportHashCheck(...args) as unknown as { enabled: boolean }).enabled;

  it("only fetches for a verifiable digest, a link, and a trusted caller", () => {
    expect(enabled(url, attested, true)).toBe(true);
    expect(enabled(url, attested, false)).toBe(false);
    expect(enabled(undefined, attested, true)).toBe(false);
    expect(enabled(url, `sha3-256:${hex}`, true)).toBe(false);
  });
});

describe("ReportHash", () => {
  const render = () =>
    renderToStaticMarkup(
      createElement(ReportHash, { value: attested, url, verify: true }),
    );

  it("turns the digest red and explains the mismatch on hover", () => {
    const served = `sha256:${"b".repeat(64)}`;
    state.check = { status: "mismatch", actual: served };
    const html = render();
    expect(html).toContain("text-content-negative");
    expect(html).toContain(
      `Doesn&#x27;t match the report at the link, which hashes to ${served}.`,
    );
  });

  it("marks a matching report without a warning", () => {
    state.check = { status: "match" };
    const html = render();
    expect(html).toContain("Matches the report at the link");
    expect(html).not.toContain("text-content-negative");
  });

  it("never reports a mismatch for a report it couldn't read", () => {
    state.check = {
      status: "unverifiable",
      reason: "the report link returned HTTP 404",
    };
    const html = render();
    expect(html).not.toContain("text-content-negative");
    expect(html).toContain("Not checked: the report link returned HTTP 404.");
  });
});
