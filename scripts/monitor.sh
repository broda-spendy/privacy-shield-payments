#!/usr/bin/env bash
#
# Privacy-Shield Payments ΓÇö indexer & system health monitor.
#
# Polls the Soroban RPC for network liveness and recent shield-contract
# events, and (optionally) the frontend API /health endpoint. Alerts on
# problems via a log file and an optional generic webhook (Slack,
# BetterUptime, PagerDuty, etc.).
#
# Exit codes:
#   0  healthy
#   1  CRITICAL (network unreachable, contract stall, frontend down)
#   2  WARN (threshold crossed but not yet critical)
#
# All configuration is via environment variables (see docs/deployment/
# MONITORING.md for the full threshold table):
#
#   RPC_URL                 Soroban RPC endpoint (default: testnet)
#   FRONTEND_HEALTH_URL     frontend API /health URL (optional)
#   CONTRACT_ID             deployed shield contract ID (optional; required
#                           for the contract-event stall check)
#   STALL_WINDOW_MINUTES    alert if no contract events in this window
#                           (default: 60)
#   LEDGER_STALE_SECONDS    alert if latest ledger older than this
#                           (default: 300)
#   ALERT_LOG               log file for alerts (default: shield-monitor.log)
#   WEBHOOK_URL             generic webhook for CRITICAL alerts (optional)

set -euo pipefail

RPC_URL="${RPC_URL:-https://soroban-testnet.stellar.org}"
FRONTEND_HEALTH_URL="${FRONTEND_HEALTH_URL:-}"
CONTRACT_ID="${CONTRACT_ID:-}"
STALL_WINDOW_MINUTES="${STALL_WINDOW_MINUTES:-60}"
LEDGER_STALE_SECONDS="${LEDGER_STALE_SECONDS:-300}"
ALERT_LOG="${ALERT_LOG:-shield-monitor.log}"
WEBHOOK_URL="${WEBHOOK_URL:-}"

HTTP_TIMEOUT=10
LEDGERS_PER_MINUTE=12   # testnet produces ~1 ledger / 5s

now_epoch="$(date -u +%s)"

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1"; }

alert() {
    local level="$1" msg="$2"
    log "ALERT [$level] $msg"
    printf '[%s] ALERT [%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$level" "$msg" >> "$ALERT_LOG"
    if [[ -n "$WEBHOOK_URL" && "$level" == "CRITICAL" ]]; then
        local payload
        payload="{\"level\":\"$level\",\"message\":\"$msg\",\"source\":\"privacy-shield-payments-monitor\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
        curl -sf -X POST -H "Content-Type: application/json" --data "$payload" "$WEBHOOK_URL" >/dev/null 2>&1 \
            || log "WARN webhook delivery failed"
    fi
}

rpc_call() {
    local method="$1" params="$2"
    curl -sf --max-time "$HTTP_TIMEOUT" -X POST \
        -H "Content-Type: application/json" \
        -H "User-Agent: privacy-shield-payments-monitor/1.0" \
        --data "{\"jsonrpc\":\"2.0\",\"id\":\"monitor\",\"method\":\"$method\",\"params\":$params}" \
        "$RPC_URL" 2>/dev/null || return 1
}

status=0

# --- Check 1: Soroban RPC liveness + ledger freshness -----------------------
latest_resp="$(rpc_call getLatestLedger '{}' || true)"
if [[ -z "$latest_resp" ]]; then
    alert CRITICAL "Soroban RPC unreachable at $RPC_URL"
    exit 1
fi

latest_seq="$(printf '%s' "$latest_resp" | jq -r '.result.sequence // empty' 2>/dev/null || true)"
latest_close="$(printf '%s' "$latest_resp" | jq -r '.result.closeTime // empty' 2>/dev/null || true)"
if [[ -z "$latest_seq" || -z "$latest_close" ]]; then
    alert CRITICAL "Soroban RPC returned an invalid getLatestLedger response"
    exit 1
fi

ledger_age=$(( now_epoch - latest_close ))
if (( ledger_age > LEDGER_STALE_SECONDS )); then
    alert CRITICAL "latest ledger $latest_seq is $ledger_age s old (threshold ${LEDGER_STALE_SECONDS}s) ΓÇö indexer/RPC stall"
    status=1
else
    log "OK latest ledger $latest_seq, age ${ledger_age}s"
fi

# --- Check 2: contract-event stall (requires CONTRACT_ID) --------------------
if [[ -n "$CONTRACT_ID" ]]; then
    # Window back in ledgers; never below 1.
    window_ledgers=$(( STALL_WINDOW_MINUTES * LEDGERS_PER_MINUTE ))
    start_ledger=$(( latest_seq - window_ledgers ))
    (( start_ledger < 1 )) && start_ledger=1

    events_resp="$(rpc_call getEvents "{\"startLedger\":$start_ledger,\"filters\":[{\"type\":\"contract\",\"contractIds\":[\"$CONTRACT_ID\"],\"topics\":[[\"*\"]],\"eventTypes\":[\"contract\"]}],\"pagination\":{\"limit\":1}}" || true)"
    if [[ -z "$events_resp" ]]; then
        alert CRITICAL "getEvents failed for contract $CONTRACT_ID"
        status=1
    else
        event_count="$(printf '%s' "$events_resp" | jq '.result.events | length' 2>/dev/null || echo -1)"
        if [[ "$event_count" == "-1" ]]; then
            alert CRITICAL "getEvents returned an invalid response for contract $CONTRACT_ID"
            status=1
        elif [[ "$event_count" == "0" ]]; then
            alert WARN "no contract events in last ${STALL_WINDOW_MINUTES}m (ledgers ${start_ledger}..${latest_seq}) ΓÇö possible indexer stall"
            status=2
        else
            log "OK contract events flowing (${event_count} in last ${STALL_WINDOW_MINUTES}m)"
        fi
    fi
else
    log "SKIP contract-event stall check (CONTRACT_ID not set)"
fi

# --- Check 3: frontend API /health (optional) ---------------------------------
if [[ -n "$FRONTEND_HEALTH_URL" ]]; then
    if curl -sf --max-time "$HTTP_TIMEOUT" "$FRONTEND_HEALTH_URL" >/dev/null 2>&1; then
        log "OK frontend health at $FRONTEND_HEALTH_URL"
    else
        alert CRITICAL "frontend /health unreachable at $FRONTEND_HEALTH_URL"
        status=1
    fi
else
    log "SKIP frontend health check (FRONTEND_HEALTH_URL not set)"
fi

if [[ "$status" == "0" ]]; then
    log "OK all checks passed"
elif [[ "$status" == "2" ]]; then
    log "WARN thresholds crossed"
fi

exit "$status"
