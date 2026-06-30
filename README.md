# Privacy-Shield Payments

Confidential peer-to-peer stablecoin transfers on Stellar/Soroban, with
ZK-style privacy and selective disclosure for compliance.

**Stellar Wave Program submission — Phase 1 (architecture & scaffolding).**

## Status: Phase 1 — Architecture & Scaffolding ✅

- [x] `PRD.md` — product requirements and full phased roadmap
- [x] `architecture.md` — system design, repo layout, module breakdown
- [x] Contract skeleton (`contracts/shield`) — full public interface defined
- [x] `cargo build --workspace` — **passes**
- [x] `cargo test --workspace` — **passes, 25/25 tests green**
- [x] CI workflow (`.github/workflows/ci.yml`)
- [x] Phase 2–6 tracked as GitHub issues

## Resolved: `cargo test` / `testutils` build blocker

An earlier version of this README documented a build blocker where
`cargo test --workspace --features testutils` failed to compile. Root cause,
for the record (and because it may help others hitting the same issue):

`soroban-env-common` 20.0.0 pins `arbitrary = "=1.3.2"` exactly, but
`arbitrary`'s own `Cargo.toml` declares its internal `derive_arbitrary`
dependency as `"1.3.2"` (a caret/non-exact requirement). Cargo was free to
resolve a newer `derive_arbitrary` (which generates `try_size_hint` calls)
against the older, exactly-pinned `arbitrary` trait crate (which doesn't
define that method) — a real version-skew bug in the dependency graph, not
in this repo's code.

**Fix:** pin `derive_arbitrary = "=1.3.2"` directly in
`contracts/shield/Cargo.toml`'s `[dev-dependencies]`, forcing it to match
the `arbitrary` crate it's bundled with.

Separately, this development environment only has Rust 1.75 available
(no network route to `rustup`/`static.rust-lang.org`), and a few transitive
crates (`base64ct`, `zeroize`) had bumped to versions requiring Cargo's
`edition2024` feature. These are pinned to compatible older versions in
`contracts/shield/Cargo.toml`.

A second fix was needed in the module-level unit tests themselves: Soroban
requires an active contract execution frame for both storage access and
`require_auth()`. Tests calling `pool::deposit` / `transfer::confidential_transfer`
directly (rather than through a `ShieldContractClient`) now wrap each call in
`env.as_contract(&contract_id, || { ... })` against a minimal dummy contract,
with `require_auth`-calling operations split into separate frames (Soroban's
auth mock disallows two `require_auth` calls for the same address within one
frame).

## Repo layout

See `architecture.md` §2 for the full breakdown. Quick orientation:

```
contracts/shield/   Soroban contract crate (pool, transfer, proof, disclosure)
docs/                Public interface reference, threat model
PRD.md               Product requirements + phased roadmap
architecture.md       System design
```

## Roadmap

Phases 2–6 (real ZK proofs, selective disclosure implementation, wallet UI,
testnet hardening, mainnet readiness) are tracked as GitHub issues in this
repo. See `PRD.md` §6 for the full phase descriptions.

## ⚠️ Privacy disclaimer (Phase 1)

This phase ships **zero real privacy guarantees**. Proof verification is
mocked (`proof.rs`, functions prefixed `unsafe_for_production_*`). Do not
use this for any non-development purpose. See `docs/threat-model.md`.
