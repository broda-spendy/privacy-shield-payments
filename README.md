# Privacy-Shield Payments

Confidential peer-to-peer stablecoin transfers on Stellar/Soroban, with
ZK-style privacy and selective disclosure for compliance.

**Stellar Wave Program submission — Phase 1 (architecture & scaffolding).**

## Status: Phase 1 — Architecture & Scaffolding

- [x] `PRD.md` — product requirements and full phased roadmap
- [x] `architecture.md` — system design, repo layout, module breakdown
- [x] Contract skeleton (`contracts/shield`) — full public interface defined
- [x] `cargo build --workspace` — **passes**
- [ ] `cargo test --workspace` — **currently blocked**, see below
- [x] CI workflow scaffolded (`.github/workflows/ci.yml`)
- [x] Phase 2–6 tracked as GitHub issues

### Known blocker: `cargo test` with `testutils`

Soroban's `testutils` feature (needed for `Env::default()` test helpers like
`mock_all_auths`) pulls in `stellar-xdr`'s `arbitrary`-derived code. As of
this submission, `stellar-xdr` 20.0.0 / 20.1.0 / 21.x's generated code calls
`arbitrary::Arbitrary::try_size_hint`, which is not present in the `arbitrary`
version that resolves against `soroban-env-common`'s pinned
`arbitrary = "=1.3.2"` requirement. This reproduces identically across all
soroban-sdk 20.x/21.x releases tried, independent of any code in this repo —
it is an upstream dependency-graph issue, not application logic.

Separately, this development environment only had Rust 1.75 available via
apt (no network access to `static.rust-lang.org` for `rustup`), and several
transitive crates (`base64ct`, `zeroize`, `time`, `hashbrown`) have since
bumped to versions requiring Cargo's `edition2024` feature, unavailable in
1.75. These were pinned to older compatible patch versions; the `arbitrary`
issue is the one remaining blocker.

**The contract logic itself is fully written and compiles.** Module-level
`#[cfg(test)]` unit tests are written for `pool.rs`, `transfer.rs`,
`proof.rs`, `disclosure.rs`, and `lib.rs`, and only fail to *run* due to the
above — not because of a defect in the tests or the logic under test.

**Next step to unblock:** build/test in an environment with current Rust
stable (1.79+) via `rustup`, where `cargo update -p arbitrary` can resolve a
compatible version, or apply a `[patch]` against a fixed `stellar-xdr`
release if/when upstream ships one.

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
