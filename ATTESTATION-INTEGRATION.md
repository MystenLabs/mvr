# Package attestations in MVR

MVR displays package audits and source-verification claims from the Sui
attestation registry. This integration targets
[`MystenLabs/attestations` at `0d7258d`](https://github.com/MystenLabs/attestations/tree/0d7258d75db7e9d54bc98cf87169904db7c9a8f8).
The previous registry deployment was for testing and is no longer supported.

The Security tab shows trusted audits about a particular package version. The
Issued tab lists a package's displayed attestations, including revoked ones.
Source-verification claims appear beside the package's source link rather than
as audit endorsements.

## Registry contract

Every subject has one derived owner address:

```ts
deriveObjectID(
  registryId,
  "0x2::object::ID",
  bcs.Address.serialize(subject).toBytes(),
);
```

The subject is the resolved package version's address, not its original publish
ID. The derivation key is a framework `ID`, so it does not contain the registry
package ID. No object needs to exist at the derived address.

`Attestation<T>` contains `id`, `data`, `subject`, `created_at_ms`, and
`revoked_at_ms`. Revocation sets `revoked_at_ms` and leaves the attestation at the
same address. In the gRPC and GraphQL JSON consumed here, `Option<u64>` is `null`
for a live attestation and a decimal string for a revoked one. `"0"` is a revoked
timestamp too. Missing or malformed status is a read error, never evidence that
a claim is live.

The Move module remains `attestations::attestations`; its source file is now
`packages/attestations/sources/attestation.move`. Display templates still reference
schema fields through `data`. See the registry's
[Display conventions](https://github.com/MystenLabs/attestations/blob/0d7258d75db7e9d54bc98cf87169904db7c9a8f8/CONVENTIONS.md).

## Read paths

- `app/src/lib/attestations.ts` derives subject addresses, checks the registry
  wrapper identity, and parses revocation status.
- `app/src/hooks/useGetAttestations.ts` lists all pages at the subject address
  through the gRPC core client with both `display` and `json` included. It keeps
  configured trusted schemas with Display output and splits live/revoked audits
  using the registry field. Source-verification schemas are excluded here.
- The Issued read enumerates the issuer's schema types across its package
  versions with GraphQL, pages through matching objects, and re-reads each over
  gRPC for current status and Display. Failed reads or malformed status contribute
  to the existing partial-results warning.
- `app/src/hooks/useSourceVerification.ts` reads typed claim contents through
  GraphQL at the same subject address. It excludes revoked claims before parsing
  `data.git_url`, `data.git_sha`, and the other source fields. The verified label
  requires the repository, package directory, and resolved commit to match the
  linked source. These reads reflect the indexer's state and can lag recent
  transactions.

Attester identity comes from the schema's defining package, checked against the
configured original package ID and its resolved upgrade lineage. Names and brand
icons come from consumer configuration, not Display content. Display controls
presentation, not revocation or identity. Links require HTTPS; inline SVG images
render through an image element, not executable DOM markup.

MVR's REST backend supplies package names, versions, and metadata. It does not
store or interpret attestation status.

## Deployment configuration

`app/src/lib/attestation-config.json` records the new testnet deployment:

- Registry package: `0x754da52dba4429dc141b4298c5afebb4697d7ff74a15580c0f3074f3f33f79e5`
- Shared Registry object: `0x333d2e0d4eba57451e942bfc1ebffd0d4daf599ff719bab556e2882109df4db3`

Both were verified through public testnet reads. The trusted-attester list is
empty, so attestation features remain disabled until approved attester packages
are added. Mainnet has no configuration. Do not reuse retired registry or
attester IDs.

After publishing attester packages against this registry, add their original
package IDs to the testnet trusted list. Configuration has the following shape;
replace placeholders with IDs from the selected network:

```json
{
  "testnet": {
    "registryPkg": "<registry package ID>",
    "registryId": "<shared Registry object ID>",
    "trustedAttestors": [
      {
        "name": "Auditor",
        "originalId": "<attester original package ID>"
      }
    ]
  }
}
```

`mainnet` accepts the same shape. Attesters may also specify `mvrName`, `iconUrl`,
and `role: "source-verification"`. The app resolves package lineage itself; do not
supply a hand-maintained list of upgrade IDs.

`NEXT_PUBLIC_ATTESTATION_CONFIG` replaces the entire checked-in configuration.
Next.js embeds this public value at build time, so rebuild after changing it.
For a public deployment, leave `NEXT_PUBLIC_LOCAL_*` unset and use fresh IDs
published to that network. Localnet IDs are not valid testnet configuration.

## Local demo from the sibling checkout

Prerequisites: Sui CLI and the localnet dependencies described in the attestation
repository, Rust, Postgres tools for the MVR demo server, and Node.js 24.x with
pnpm for the app and regression tests. Install the frontend dependencies first:

```bash
pnpm --dir app install --frozen-lockfile
```

Run the sibling repository's stack launcher, using its current registry code:

```bash
cd ../attestations
MVR_DIR="$(cd ../mvr && pwd)" bash demo/scripts/demo-up.sh
```

The launcher publishes fresh packages, creates live and revoked attestations,
writes `demo-ids.json`, invokes MVR's `scripts/write-demo-env.sh`, starts the seeded
MVR API on port 8000, and starts the frontend on port 3000. It overwrites
`app/.env`; preserve any existing environment file before launching.

The JSON handoff still contains `registryId`, `attestationRegistryPkg`, `subjects`,
`dependencyVersions`, and trusted/untrusted attester metadata. The env generator
repoints both UI networks at the local stack. No registry IDs are hardcoded into
the generated environment.

Browse these pages with either UI network selected:

- `http://localhost:3000/package/@demo/subject`: two live trusted audits and one
  revoked audit. The untrusted auditor and undisplayed internal note are omitted.
- `http://localhost:3000/package/@demo/dependency/1`: two live trusted audits.
- `http://localhost:3000/package/@demo/dependency/2`: no audits.
- `http://localhost:3000/package/@auditor-a/audit`: Issued separates the revoked
  subject audit from the live subject and dependency audits.

Stop the launcher with Ctrl-C. Do not use SIGKILL; it bypasses cleanup of the
localnet's Postgres processes. The sibling `demo/scripts/demo-down.sh` is its
recovery/cleanup command.

For a separately managed chain/API, generate only the frontend environment:

```bash
RPC_URL=http://127.0.0.1:19000 \
GRAPHQL_URL=http://127.0.0.1:19125/graphql \
MVR_ENDPOINT=http://127.0.0.1:8000 \
bash scripts/write-demo-env.sh ../attestations/demo-ids.json
```

Use IDs from that running chain. Start or restart the app after writing the env.
Demo README and icon sources are pinned to the supported registry revision in
`crates/mvr-api/examples/demo_server.rs` and `scripts/write-demo-env.sh`. Update
those pins together when adopting another registry revision.

## Verification

From the MVR root:

```bash
pnpm --dir app test
pnpm --dir app exec tsc --noEmit --incremental false
pnpm --dir app build
```

Regression tests exercise the actual mapping and query functions with fake
transport responses. They cover address derivation, revocation including zero,
malformed status, registry identity, trust/Display filtering, pagination, Issued
failure reporting, source-location matching, and complete package-version
pagination. They do not replace a
browser check against freshly published registry state.

## Deferred work

This migration does not introduce on-chain trust-list discovery, new Display
conventions, link-host allowlists, a full local MVR indexer, or a first-class
localnet UI network. Subject reads still filter trust client-side and Issued
per-object reads remain sequential. Performance work should preserve current
revocation checks and error reporting.
