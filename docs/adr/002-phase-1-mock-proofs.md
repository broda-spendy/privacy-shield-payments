# 002: Mock ZK proofs in Phase 1

**Status:** Accepted
**Date:** 2026-07-31

## Context

A confidential-transfer contract must verify that a transfer does not
overdraw a balance without revealing the amount — this requires real zero
knowledge range-proofs in production. The production proof scheme is not
finalized for Phase 2 (see the PRD risk table: Bulletproofs via
`curve25519-dalek` vs. Stellar Protocol 25 native primitives). Waiting for
that decision before writing any contract code would stall all downstream
work on the pool, transfer, and disclosure modules.

## Decision

Phase 1 ships a `Proof` enum with a single `Mock` variant
(`ProofKind::Mock(MockProof)`). `proof::verify` returns `true` for any
well-formed mock proof and performs **no cryptographic verification**
(functions are explicitly named `unsafe_for_production_*` to make this
unmistakable). The `Proof` interface and `verify(proof, public_inputs)`
signature are designed so that Phase 2's real verifier is a drop-in
replacement. This is documented in `architecture.md` §3.4 and
`docs/threat-model.md`.

## Consequences

- **Easier:** the full contract control flow (deposit/withdraw/transfer)
  is built, tested, and reviewed in Phase 1; the team learns the
  privacy-sensitive paths before crypto exists.
- **Harder:** the codebase is genuinely **not** safe for any non-test
  deployment until Phase 2 lands — this must never be mistaken for a
  finished privacy product.
- **Contract:** the mock is isolated behind the `Proof` interface, so the
  Phase 2 swap does not redesign the modules that consume it.
