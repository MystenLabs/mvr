import { useQuery } from "@tanstack/react-query";
import { toHex } from "@mysten/sui/utils";
import { AppQueryKeys } from "@/utils/types";
import { NoRefetching } from "@/lib/utils";

/** `link_hash` algorithms the browser can recompute (WebCrypto), with their
 *  digest length in hex characters. Anything else — sha3, blake2b, a bare value
 *  with no `alg:` prefix — is left unchecked rather than guessed at, so a report
 *  is never flagged as mismatched against a digest we computed differently. */
const ALGORITHMS: Record<string, { name: string; hexLength: number }> = {
  sha256: { name: "SHA-256", hexLength: 64 },
  sha384: { name: "SHA-384", hexLength: 96 },
  sha512: { name: "SHA-512", hexLength: 128 },
};

/** The report is fetched without the viewer asking, so bound how much a link
 *  can make the page download and how long it can stall it. */
export const MAX_REPORT_BYTES = 32 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

export type ReportHashCheck =
  | { status: "match" }
  /** `actual` is the digest of the bytes served at the link, in the attested
   *  value's `alg:hex` form. */
  | { status: "mismatch"; actual: string }
  /** The report couldn't be read: network/CORS failure, HTTP error, too large,
   *  or too slow. Says nothing about whether it matches. */
  | { status: "unverifiable"; reason: string };

export interface Digest {
  alg: string;
  hex: string;
}

/** Parse an `alg:hex` digest, or `undefined` if it isn't one we can recompute. */
export function parseDigest(value: string): Digest | undefined {
  const i = value.indexOf(":");
  if (i < 0) return undefined;
  const alg = value.slice(0, i).toLowerCase();
  const hex = value.slice(i + 1).toLowerCase();
  const spec = ALGORITHMS[alg];
  if (!spec || hex.length !== spec.hexLength || !/^[0-9a-f]+$/.test(hex)) {
    return undefined;
  }
  return { alg, hex };
}

class ReportTooLargeError extends Error {}

/**
 * Download the report at `url` and compare its digest to the attested one.
 *
 * The response is only ever read as raw bytes and hashed — never parsed,
 * rendered, or saved — so a malicious report has nothing here to exploit. What
 * remains are resource and privacy risks, which the request bounds: no cookies
 * or referrer are sent, and the download is capped in size and time.
 */
export async function checkReportHash(
  url: string,
  expected: Digest,
  fetchImpl: typeof fetch = fetch,
): Promise<ReportHashCheck> {
  let bytes: Uint8Array;
  try {
    const res = await fetchImpl(url, {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return {
        status: "unverifiable",
        reason: `the report link returned HTTP ${res.status}`,
      };
    }
    bytes = await readCapped(res, MAX_REPORT_BYTES);
  } catch (e) {
    return { status: "unverifiable", reason: failureReason(e) };
  }
  const digest = await crypto.subtle.digest(
    ALGORITHMS[expected.alg]!.name,
    bytes,
  );
  const actual = toHex(new Uint8Array(digest));
  return actual === expected.hex
    ? { status: "match" }
    : { status: "mismatch", actual: `${expected.alg}:${actual}` };
}

/** Read a response body, giving up as soon as it passes `limit` bytes (a
 *  declared Content-Length over the limit fails before reading anything). */
async function readCapped(res: Response, limit: number): Promise<Uint8Array> {
  if (Number(res.headers.get("content-length")) > limit) {
    throw new ReportTooLargeError();
  }
  if (!res.body) return new Uint8Array();

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      void reader.cancel();
      throw new ReportTooLargeError();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function failureReason(e: unknown): string {
  if (e instanceof ReportTooLargeError) {
    return `the report is larger than ${MAX_REPORT_BYTES / 1024 / 1024} MiB`;
  }
  if (e instanceof DOMException && e.name === "TimeoutError") {
    return "the report took too long to download";
  }
  // A CORS rejection and a network failure are indistinguishable to the page.
  return "the report couldn't be fetched (its host may not allow cross-origin reads)";
}

/**
 * Recompute the digest of the report at `url` and compare it to the attested
 * `linkHash`. Stays idle (`data` undefined) when there's no link, the digest
 * isn't one we can recompute, or `enabled` is false — callers pass false for
 * attesters off the trusted list, so on-chain data from an arbitrary package
 * can't make the viewer's browser request an arbitrary URL.
 */
export function useReportHashCheck(
  url: string | undefined,
  linkHash: string | undefined,
  enabled: boolean,
) {
  const expected = linkHash ? parseDigest(linkHash) : undefined;
  return useQuery({
    queryKey: [AppQueryKeys.REPORT_HASH, url, linkHash],
    enabled: enabled && !!url && !!expected,
    queryFn: () => checkReportHash(url!, expected!),
    ...NoRefetching,
    retry: false,
  });
}
