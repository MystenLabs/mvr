#!/usr/bin/env bash
# Generate app/.env for the local attestation demo from the attestation-registry
# repo's demo-ids.json: repoint all networks at the local stack and inject the
# attestation config (registry id/pkg + trusted attesters with their lineage).
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
# any later version ids (deduped) — the M2 client-side trusted set.
CONFIG=$(python3 - "$DEMO_IDS" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
# Friendly display names for the demo attesters (presentation lives in the
# consumer's trust config, not on-chain).
NAMES = {
    "audit_example": "Example Auditor",
    "vuln_example": "Example Security Scanner",
}
# MVR names of the attester packages (kept in sync with demo_server.rs).
MVR_NAMES = {
    "audit_example": "@example-auditor/audits",
    "vuln_example": "@example-scanner/disclosures",
}
# Brand icons (served from app/public). Presentation lives in the consumer's
# trust config, never on-chain; absent → the UI falls back to an initials avatar.
ICONS = {
    "audit_example": "/demo-attestors/auditor.svg",
    "vuln_example": "/demo-attestors/scanner.svg",
}
attestors = []
for a in d["trustedAttestors"]:
    lineage = list(dict.fromkeys([a["originalId"], a.get("latestId", a["originalId"])]))
    attestors.append({
        "name": NAMES.get(a["name"], a["name"]),
        "iconUrl": ICONS.get(a["name"]),
        "mvrName": MVR_NAMES.get(a["name"]),
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
