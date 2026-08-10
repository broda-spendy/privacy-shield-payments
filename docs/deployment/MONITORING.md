# Monitoring: Stellar Indexer Health & Alert Setup

This document describes how to monitor the Privacy-Shield Payments system ΓÇö
the Soroban shield contract, the indexer, and the frontend API ΓÇö and the
alert thresholds enforced by [`scripts/monitor.sh`](../../scripts/monitor.sh).

## Overview

The monitor is a single self-contained script (`scripts/monitor.sh`) that
requires only `bash`, `curl`, and `jq`. Run it periodically (e.g. every
5 minutes from `cron` or a CI scheduled job). It checks, in order:

1. **Soroban RPC liveness** ΓÇö `getLatestLedger` succeeds and the latest
   ledger is fresh.
2. **Contract-event stall** ΓÇö the shield contract has emitted events in the
   configured window (indexer stall detection). Requires `CONTRACT_ID`.
3. **Frontend API health** ΓÇö optional, requires `FRONTEND_HEALTH_URL`.

Notes on data sources:

- Soroban **contract events are not exposed by Horizon**; they are read from
  the Soroban RPC `getEvents` method, which is what `monitor.sh` uses.
- For networks where a Stellar indexer is deployed (e.g. a
  `soroban-indexer`-style service), the contract-event check doubles as the
  indexer-stall check: a healthy indexer reflects contract events into its
  downstream store, so a stalled indexer shows up as a missing-event alert.

## Threshold table

| Check | Signal | Warn | Critical (exit 1) | Default |
|---|---|---|---|---|
| RPC reachability | `getLatestLedger` HTTP/parse result | ΓÇö | RPC unreachable or invalid response | `RPC_URL=https://soroban-testnet.stellar.org` |
| Ledger freshness | `now - latest.closeTime` | ΓÇö | `> LEDGER_STALE_SECONDS` | `LEDGER_STALE_SECONDS=300` (5 min) |
| Contract-event stall | events in `[latest - window, latest]` | `0` events in window (exit 2) | `getEvents` HTTP/parse failure | `STALL_WINDOW_MINUTES=60`, `CONTRACT_ID` (unset) |
| Frontend health | `/health` HTTP 2xx | ΓÇö | non-2xx / unreachable | `FRONTEND_HEALTH_URL` (unset) |
| Webhook delivery | HTTP 2xx from webhook | delivery failure logged | ΓÇö | `WEBHOOK_URL` (unset) |

Suggested thresholds for production (mainnet):

| Check | Warn | Critical | Rationale |
|---|---|---|---|
| Ledger staleness | ΓÇö | > 5 min | Testnet produces ~1 ledger / 5 s; a 5-minute gap means the RPC or indexer is stalled. |
| Event stall window | ΓÇö | 60 min with zero events | Long enough to ignore quiet hours; short enough to catch a dead indexer. Tune per traffic: high-volume networks may use 15 min. |
| RPC response timeout | ΓÇö | 10 s | `--max-time 10` per request in `monitor.sh`. |

## Alert channels

At least one channel is always configured: **a log file**
(`ALERT_LOG`, default `shield-monitor.log`). This satisfies the minimum
requirement of an alert sink.

Optionally set `WEBHOOK_URL` to a generic webhook for **CRITICAL** alerts:

- **Slack**: incoming webhook URL
  (`https://hooks.slack.com/services/...`).
- **BetterUptime**: Heartbeat/incident webhook URL.
- **PagerDuty**: Events API v2 integration URL
  (`https://events.pagerduty.com/v2/enqueue/...`).
- Any other HTTP endpoint that accepts a JSON POST.

The webhook payload is:

```json
{
  "level": "CRITICAL",
  "message": "<alert text>",
  "source": "privacy-shield-payments-monitor",
  "time": "<ISO-8601 UTC>"
}
```

## Usage

### Prerequisites

- `bash` 4+, `curl`, `jq`.
- A deployed shield contract ID for the event-stall check
  (see [#27](https://github.com/broda-spendy/privacy-shield-payments/issues/27)).
  Without it, the stall check is skipped and a log line records the skip.

### Local run

```sh
export RPC_URL="https://soroban-testnet.stellar.org"
export CONTRACT_ID="CA3...your-deployed-contract-id..."
export FRONTEND_HEALTH_URL="https://api.example.com/health"
export ALERT_LOG="/var/log/shield-monitor.log"
export WEBHOOK_URL="https://hooks.slack.com/services/T000/B000/XXX"
./scripts/monitor.sh
```

### Cron (every 5 minutes)

```cron
*/5 * * * *  cd /opt/privacy-shield-payments && ./scripts/monitor.sh
```

The script exits non-zero on any alert, so a supervisor (cron email, CI,
uptime service) can also page on the exit code.

## Alert semantics

- **WARN** (`exit 2`): a threshold is crossed but the system is still
  answering ΓÇö e.g. a quiet window with no contract events. Logged, no
  webhook by default.
- **CRITICAL** (`exit 1`): the system is broken or unreachable ΓÇö RPC down,
  stale ledger, frontend down, or `getEvents` failing. Logged and pushed to
  the webhook if configured.
- **OK** (`exit 0`): all checks passed.

## Operational notes

- The event-stall check counts `contract`-type events for `CONTRACT_ID` over
  `[latest - STALL_WINDOW_MINUTES * 12, latest]` ledgers (testnet cadence of
  ~1 ledger / 5 s Γëê 12 / min). If the network cadence differs, adjust
  `LEDGERS_PER_MINUTE`.
- Rotate `ALERT_LOG` (e.g. `logrotate`) to avoid unbounded growth.
- Do not rely on the stall check to prove indexer write-through; combine it
  with application-level assertions (e.g. the indexer's last-processed
  ledger watermark) for stronger guarantees.
