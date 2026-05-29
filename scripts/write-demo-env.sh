#!/usr/bin/env bash
# Generate app/.env for the local attestation demo from the attestation-registry
# repo's demo-ids.json: repoint all networks at the local stack and inject the
# attestation config (registry id/pkg + trusted attesters with their lineage).
#
# Usage:
#   bash scripts/write-demo-env.sh [path/to/demo-ids.json]
# Env overrides: RPC_URL, MVR_ENDPOINT.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_ENV="$SCRIPT_DIR/../app/.env"
DEMO_IDS="${1:-$HOME/Mysten/sui-attestation-registry/demo-ids.json}"
RPC="${RPC_URL:-http://127.0.0.1:9000}"
MVR="${MVR_ENDPOINT:-http://127.0.0.1:8000}"

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
    "audit_example": "@demo/audit",
    "vuln_example": "@demo/vuln",
}
attestors = []
for a in d["trustedAttestors"]:
    lineage = list(dict.fromkeys([a["originalId"], a.get("latestId", a["originalId"])]))
    attestors.append({
        "name": NAMES.get(a["name"], a["name"]),
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
    echo "NEXT_PUBLIC_ATTESTATION_CONFIG='$CONFIG'"
} > "$APP_ENV"

echo "wrote $APP_ENV"
cat "$APP_ENV"
