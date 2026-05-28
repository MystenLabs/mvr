# Attestation Integration — Surfacing Package Attestations in MVR

This document is the implementation plan for displaying package attestations on
the MVR web app, sourced from a Sui attestation registry. It records the
decisions reached during design exploration and the steps to build from.

> **Two repos.** Paths under `app/` and `crates/` are in **this (mvr) repo**.
> Paths like `DESIGN.md`, `CONVENTIONS.md`, `ts/`, `packages/`, `scripts/`
> refer to the **attestation-registry repo** (`sui-attestation-registry`),
> which defines the on-chain registry, the Display-field conventions, and the
> TypeScript read library this builds on. See that repo's `DESIGN.md` for
> on-chain rationale and `CONVENTIONS.md` for the Display conventions.

## Goal

When browsing a subject package on the MVR web app, show the attestations made
about it by a curated, hardcoded set of **trusted attestor packages** —
rendered from each attestation's on-chain Display. Stand the whole thing up
against a simulated (localnet) network, faithfully enough that the same code
path runs in production.

**Primary outcome: an upstreamable integration** (fits MVR's architecture and
conventions), not a throwaway demo.

## How MVR fetches data (findings)

MVR's frontend (`app/`, Next.js + dapp-kit + react-query) reads from two
independent sources:

1. **`mvr-api` (REST)** — name resolution and search. `useResolveMvrName` →
   `GET {mvrEndpoint}/v1/names/{name}` returns a `ResolvedName`
   (`package_address`, `package_info`, `version`, …). Backed by Postgres, which
   `mvr-indexer` normally fills from checkpoints.
2. **dapp-kit `SuiClient` (JSON-RPC)** — on-chain reads (versions, deps,
   package-info objects). `DefaultClients` (`app/src/components/providers/client-provider.tsx`)
   hardcodes per-network URLs and already includes a `localnet` client plus
   `SuiGraphQLClient`s.

**Reading attestations does not touch the mvr-api backend** — it is a pure
chain read (derive the Box address from the subject, list its owned
`Attestation<T>` objects). So the attestation surface is fundamentally a
frontend feature pointed at whatever chain the `SuiClient` uses.

## Locked decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Approach A**: seed Postgres + localnet | Faithful to how the app fetches; isolates us from MVR's on-chain name-registration contracts. The `crates/mvr-api/tests/mvr_test_cluster.rs` `setup_dummy_data` pattern inserts directly into `name_records`/`packages`/`package_infos` — no indexer, no live chain needed for resolution. |
| D2 | **JSON-RPC**, not gRPC | MVR is pinned to `@mysten/sui@1.39.0`, which has no `/grpc` export. Adding `SuiGrpcClient` forces a 1.x→2.x SDK upgrade dragging dapp-kit `0.19→1.0`, kiosk, suins — a repo-wide modernization that dwarfs (and destabilizes) this feature. gRPC stays a separate, future MVR initiative; the attestation-registry repo's `ts/lib/queries.ts` (gRPC) ports back trivially when it lands. |
| D3 | **Subject = `package_address`** (resolved version), not original ID | Directly available on `ResolvedName`; the demo seeds the on-chain attestation against the same value. |
| D4 | **Trusted set = original package IDs** | Mirrors on-chain `attester_of<T>() = type_name::original_id<T>()`. Any type from any version of a trusted package counts. |
| D5 | **Option 2**: server-side exact-type `MatchAny`, trusted set = `Attestation<T>` types each trusted attester **registered a Display for** | The JSON-RPC `StructType` filter matches type params all-or-nothing (`sui-json-rpc-types` `SuiObjectDataFilter::matches`) — no inner-package prefix. Spam-resistance therefore requires the exact trusted-type list. "Registered a Display" is the deliberate, finite, evolution-friendly definition, and Display registration carries the same `internal::Permit<T>` bytecode identity as `attest`, so it can't be forged. |
| D6 | **Display-gate**: only count `Attestation<T>` with a registered Display | Legibility/trust signal; already implied by D5. |
| D7 | **Identity from config; content host-constrained** | Attester brand icon/name come from the trusted-list config, never from on-chain data (defeats within-whitelist impersonation). Per-attestation `image_url`/`link` may come from Display, constrained to the attester's declared `domains`. |
| D8 | **Show revoked/expired, de-emphasized** | A revoked audit is itself information; a trust surface should be transparent. |
| D9 | **Demo == production code path** | `sui start --with-graphql` serves GraphQL on localnet, so lineage/Display enumeration runs identically locally and in prod. Only mvr-api's name→address rows are synthetic; all chain state the read touches is real. |

## Architecture

```
Browser (MVR app, @mysten/sui 1.39 JSON-RPC)
  │
  ├─(REST)──► mvr-api ──► Postgres (seeded: name_records → package_address)   [resolution only]
  │
  ├─(JSON-RPC)──► localnet fullnode :9000
  │                 • getOwnedObjects(boxAddr, MatchAny[Attestation<Ti>])     [the attestations]
  │
  └─(GraphQL)───► localnet graphql (--with-graphql)
                    • packageVersions(address) → trusted lineage / original id
                    • objects(type: Display<…Attestation>) → trusted type set [cached per attester]
```

`boxAddr = deriveObjectID(registryId, '0x2::object::ID', subjectBytes)` — the
client-agnostic derivation in the attestation-registry repo's `ts/lib/boxes.ts`,
ports to MVR as-is.

## Implementation sections

### Section 1 — Demo environment (the simulated network)

1. `sui start --with-faucet --with-graphql` (localnet + faucet + GraphQL/indexer).
2. Publish on localnet: `attestation_registry` (creates the shared `Registry`
   in `init`), `audit_example`/`vuln_example` attestors, and subject package(s).
   **Exercise evolution**: upgrade an attestor to add a second schema type
   (e.g. `AuditV2`) and register its Display, so both surface under one attester.
   Create `Attestation<Audit>`/`Attestation<AuditV2>`/`Attestation<Vulnerability>`
   about the subjects, and revoke one (to show the de-emphasized state). Extend
   the attestation-registry repo's `scripts/run-demo.sh` + `ts/demo.ts`; emit the
   published IDs for step 3.
3. Seed Postgres (test-cluster style): run `mvr-schema` `MIGRATIONS`, insert
   `name_records` + `packages` + `package_infos` so a demo name (`@demo/subject`)
   resolves to the **same `package_address`** published in step 2. Lift
   `mvr_test_cluster.rs::setup_dummy_data` into a standalone seeding binary.
4. Run `mvr-api` against that Postgres (`--network mainnet`; cosmetic, resolution
   is a DB read).
5. Point the frontend locally: override the `mainnet` slot of `DefaultClients`
   (SuiClient URL → localnet, `mvrEndpoints.mainnet` → local mvr-api, graphql →
   local). Keep using the `mainnet` slot rather than adding a UI network — the
   feature stays network-generic; the demo is "mainnet, repointed."

**Invariant:** seeded `name_records.package_address` == published subject ID on
localnet, so resolving the name lands on a chain object whose Box has attestations.

### Section 2 — Attestation read layer (JSON-RPC)

New code in MVR (`app/src`):

- **`lib/constants.ts`**: `attestationRegistryPkg`, `attestationRegistryId`
  (per network; demo fills `mainnet` with the localnet registry id), and
  `trustedAttestors: { originalId, name, iconUrl, domains? }[]`.
- **`boxAddress` helper**: port the attestation-registry repo's `ts/lib/boxes.ts`
  (pure `deriveObjectID`).
- **Trusted-type resolver** (cached per attester, GraphQL):
  1. For each trusted `originalId`, get its lineage via `packageVersions`.
  2. Enumerate `Attestation<T>` types the lineage registered Displays for —
     either `objects(filter:{type:"0x2::display_registry::Display<…attestation_registry::Attestation>"})`
     filtered to trusted lineages, or per-attester datatypes → derived
     `Display<Attestation<T>>` existence check. **Spike: confirm GraphQL generic
     type-filter matching; pick the mechanism.**
  3. Result: exact `trustedAttestationTypes: string[]`.
- **`hooks/useGetAttestations.ts`**: `getOwnedObjects(boxAddr, { MatchAny:
  trustedAttestationTypes.map(StructType) }, { showType, showDisplay, showContent })`,
  paginated → map each `SuiObjectResponse` into the `AttestationInfo` shape
  (`{ id, version, digest, type, display, content }`; JSON-RPC nests Display
  under `data.display.data`).
- **Effectiveness**: port the attestation-registry repo's `ts/lib/conventions.ts`
  (`isEffective`, `active`/`expires_at`/`requires`) — operates purely on
  `display` + `id`, so it drops in unchanged.

### Section 3 — UI surface

- **New "Attestations" tab** in `SinglePackage.tsx`'s `Tabs` array
  (`key`/`title`/`icon`/`component` + a `label` count badge like `DependencyCount`;
  the non-zero count is the at-a-glance trust signal).
- **`SinglePackageAttestations`** (Dependencies-tab idiom: `Accordion` +
  `LoadingState` + `EmptyState`), data via `useGetAttestations(name.package_address, network)`:
  - **Group by trusted attester** — section per attester, headed by config
    `name` + `originalId` + config `iconUrl`. Evolution shows here (`Audit` and
    `AuditV2` under one attester).
  - **Row**: Display `name` + `description`; the **exact `T`** (monospace,
    truncated + tooltip); effectiveness badge (active / **revoked** / expired /
    requires-unmet) from `conventions.ts`, ineffective shown de-emphasized.
  - `image_url` / `link` rendered per Section 4 hygiene rules.
- **(Phase 2) Sidebar trust badge** in `SinglePackageSidebar` — compact
  "✓ Attested by N trusted attestors"; same hook (react-query dedupes).

### Section 4 — Convention additions (attestation-registry repo: `CONVENTIONS.md` / `ts/lib/conventions.ts`)

Add two **optional** conventions using the standard Sui Display keys (so
attestations render in any Display-aware tool, not just MVR):

- **`image_url`** — per-attestation content (badge/grade/report thumbnail).
- **`link`** — URL to the full report/detail.

Security (D7): identity icon/name come from config, never Display. For
`image_url`/`link` from Display: https-only, `referrerPolicy="no-referrer"`,
`rel="noopener noreferrer"`, render destination host visibly, and **constrain
the host to the attester's configured `domains`** (soft allowlist; default to
hygiene-only if an attester declares no domains).

## Build order (milestones)

- **M0** — Localnet env up; packages published (incl. an upgraded attester);
  attestations created + one revoked; IDs emitted.
- **M1** — Postgres seeded + mvr-api running; frontend repointed; `@demo/subject`
  resolves and the package page renders against localnet.
- **M2** — Read hook with a **client-side lineage filter** (proves the
  end-to-end pipeline; not yet spam-proof) + the Attestations tab rendering
  Display fields and effectiveness.
- **M3** — Swap in the Option 2 **server-side `MatchAny`** over the
  Display-registered trusted-type set (spam-resistance); finalize the
  enumeration mechanism from the M2 spike.
- **M4** — `image_url`/`link` conventions + host-allowlist policing; sidebar
  trust badge.

## Task checklist

- [ ] Extend the attestation-registry repo's `scripts/run-demo.sh` / `ts/demo.ts`:
      publish + upgrade attester (`AuditV2`), create + revoke attestations, emit
      published IDs.
- [ ] Standalone Postgres seeder (lift `setup_dummy_data`) → `name_records`
      pointing at published subject IDs.
- [ ] Local run recipe: localnet + mvr-api + frontend env overrides.
- [ ] `lib/constants.ts`: registry ids + `trustedAttestors` config.
- [ ] Port `boxAddress`; add JSON-RPC `AttestationInfo` mapper.
- [ ] Spike: GraphQL generic type-filter for `Display<Attestation<*>>`; choose
      enumeration mechanism.
- [ ] Trusted-type resolver (lineage + Display enumeration), cached per attester.
- [ ] `useGetAttestations` hook + port `conventions.ts`.
- [ ] Attestations tab + count label; group-by-attester; row with exact `T`,
      effectiveness, de-emphasized ineffective.
- [ ] `image_url`/`link` conventions in `CONVENTIONS.md` + `conventions.ts`;
      host-allowlist rendering in the tab.
- [ ] Sidebar trust badge (phase 2).

## Out of scope / follow-ups

- gRPC read path (revisit when MVR moves to `@mysten/sui` 2.x).
- Full `mvr-indexer`-on-localnet stack (D1 seeds Postgres directly instead).
- Adding a first-class `localnet` network to the MVR UI (the demo repoints
  `mainnet`).
- Upstream PR: trusted-attestor list as real config vs. hardcoded constant.
