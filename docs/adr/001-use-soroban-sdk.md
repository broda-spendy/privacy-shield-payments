# 001: Use the Soroban SDK over raw host functions

**Status:** Accepted
**Date:** 2026-07-31

## Context

Soroban contracts can be written either against the high-level
[`soroban-sdk`](https://crates.io/crates/soroban-sdk) or directly against
the lower-level host function interfaces (`soroban-env-guest`, raw `Env`
`call` ABI). The raw route offers maximum control and minimal dependency
weight, while the SDK provides typed storage helpers, `Address`,
`require_auth`, panic-safe error handling, and ergonomic test scaffolding.

This is a Phase 1 scaffolding project whose goal is fast iteration on the
privacy-sensitive control flow (pool bookkeeping, transfer routing, proof
verification boundaries) with extensive unit tests.

## Decision

Write the contract against the Soroban SDK (`soroban-sdk` crate, pinned
exactly to `=20.0.0`). Use the SDK's `#[contract]`, `#[contractimpl]`,
`Env`, `Address::require_auth`, and `SorobanEnv` storage helpers everywhere
possible; do not hand-roll host function calls.

## Consequences

- **Easier:** rapid development, typed storage, idiomatic auth, and
  `soroban-sdk`'s test harness (used throughout `contracts/shield/src/test.rs`).
- **Harder:** the dependency graph is large and transitively pins crates
  (`ethnum = "=1.5.0"`, `base64ct`, `zeroize`, `derive_arbitrary`), which
  constrains the CI toolchain (see `README.md` — "CI toolchain pinned to 1.95").
- **Risk:** SDK API churn. Pinning `=20.0.0` trades upgrade friction for a
  stable build; the pin must be revisited deliberately, not casually bumped.
