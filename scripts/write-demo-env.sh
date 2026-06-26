#!/usr/bin/env bash
# Generate app/.env for the local attestation demo from the attestation-registry
# repo's demo-ids.json: repoint all networks at the local stack and inject the
# attestation config (registry id/pkg + trusted attesters with their lineage).
#
# demo-ids.json (produced by the attestation-registry repo's run-demo.sh):
#   {
#     "registryId": "0x…",                // the shared Registry object id
#     "attestationRegistryPkg": "0x…",     // the attestations package id
#     "subjects": { "subject": "0x…", "dependency": "0x…" },
#     "trustedAttestors": [
#       { "name": "auditor_a", "originalId": "0x…", "latestId": "0x…" }
#     ],
#     "createdAttestations": { "dependencyAudit": "0x…", "subjectAuditV2": "0x…" }
#   }
# This script reads registryId, attestationRegistryPkg, and trustedAttestors
# (name → friendly presentation via ATTESTORS below; originalId+latestId → lineage).
#
# Usage:
#   bash scripts/write-demo-env.sh <path/to/demo-ids.json>
# The path is required (or set ATTESTATION_DEMO_IDS); demo-ids.json is written
# by the attestation-registry repo's run-demo.sh and lives in that checkout,
# whose location this repo can't know. Env overrides: RPC_URL, MVR_ENDPOINT.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_ENV="$SCRIPT_DIR/../app/.env"
DEMO_IDS="${1:-${ATTESTATION_DEMO_IDS:-}}"
if [[ -z "$DEMO_IDS" ]]; then
    echo "usage: write-demo-env.sh <path/to/demo-ids.json> (or set ATTESTATION_DEMO_IDS)" >&2
    echo "  demo-ids.json is produced by the attestation-registry repo's run-demo.sh" >&2
    exit 2
fi
RPC="${RPC_URL:-http://127.0.0.1:9000}"
MVR="${MVR_ENDPOINT:-http://127.0.0.1:8000}"
GRAPHQL="${GRAPHQL_URL:-http://127.0.0.1:9125/graphql}"

if [[ ! -f "$DEMO_IDS" ]]; then
    echo "demo-ids.json not found at $DEMO_IDS (run the attestation demo first)" >&2
    exit 1
fi

# Build the attestation config. Each attester's lineage is its original id plus
# any later version ids (deduped) — the client-side trusted set.
CONFIG=$(python3 - "$DEMO_IDS" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
# Per-attester presentation metadata, keyed by the demo-ids `name`. Presentation
# lives in the consumer's trust config, never on-chain. `iconUrl` points at the
# attester's brand icon hosted with its package in the attestation-registry repo
# (the same place its README — shown on the mvr page — lives), so no demo asset
# ships in the mvr app. `mvrName` is kept in sync with demo_server.rs. An
# attester absent from this map falls back to its raw name with no icon/mvrName.
RAW = "https://raw.githubusercontent.com/mdgeorge4153/sui-attestation-registry/mdgeorge/attest-positive"
ATTESTORS = {
    "auditor_a": {
        "name": "Auditor A",
        "mvrName": "@auditor-a/audit",
        "iconUrl": f"{RAW}/demo/auditor_a/icon.svg",
    },
    # PR-B attester; its icon lands at demo/vuln_reporter_a/icon.svg when that
    # package is added. Inert here (not in PR A's trusted set).
    "vuln_example": {
        "name": "Example Security Scanner",
        "mvrName": "@example-scanner/disclosures",
        "iconUrl": f"{RAW}/demo/vuln_reporter_a/icon.svg",
    },
}
attestors = []
for a in d["trustedAttestors"]:
    meta = ATTESTORS.get(a["name"], {})
    lineage = list(dict.fromkeys([a["originalId"], a.get("latestId", a["originalId"])]))
    attestors.append({
        "name": meta.get("name", a["name"]),
        "iconUrl": meta.get("iconUrl"),
        "mvrName": meta.get("mvrName"),
        "originalId": a["originalId"],
        "lineage": lineage,
    })
print(json.dumps({
    "registryPkg": d["attestationRegistryPkg"],
    "registryId": d["registryId"],
    "trustedAttestors": attestors,
}, separators=(",", ":")))
PY
)

{
    echo "NEXT_PUBLIC_LOCAL_RPC_URL=\"$RPC\""
    echo "NEXT_PUBLIC_LOCAL_MVR_ENDPOINT=\"$MVR\""
    echo "NEXT_PUBLIC_LOCAL_GRAPHQL=\"$GRAPHQL\""
    echo "NEXT_PUBLIC_ATTESTATION_CONFIG='$CONFIG'"
} > "$APP_ENV"

echo "wrote $APP_ENV"
cat "$APP_ENV"
