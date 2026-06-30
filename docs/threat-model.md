# Threat Model — Phase 1

## Scope

This document covers the privacy and security posture of Privacy-Shield
Payments **as of Phase 1 (architecture & scaffolding)**. It will be revised
at the end of each subsequent phase.

## Summary

**Phase 1 provides no real privacy guarantees.** It exists to validate
control flow, interfaces, and bookkeeping logic before cryptography is
introduced in Phase 2.

## What Phase 1 does NOT protect against

- **Storage inspection**: shielded balances and the `MockProof.amount`
  field are stored and passed as plain `i128` values. Anyone with the
  ability to read contract storage (e.g. via RPC `getLedgerEntries`, or by
  running a Soroban host locally against the same state) can see exact
  balances and transfer amounts.
- **Proof forgery**: `proof::verify` (Phase 1 mock) only checks that
  `amount > 0` and that a nonce is present. It performs no cryptographic
  binding between the proof and the actual balances involved. A malicious
  caller with `require_auth()` rights over an account could construct a
  `MockProof` with any amount they choose.
- **Network-level metadata**: even with real ZK proofs in later phases,
  this design does not hide *that* a transaction occurred, *when* it
  occurred, or which two contract addresses were involved at the
  `confidential_transfer` call level (sender/recipient addresses are
  arguments, not hidden). Only the **amount** is intended to become
  confidential; full sender/receiver anonymity (e.g. via stealth addresses)
  is not in scope for this project as currently planned.

## What Phase 1 DOES establish correctly

- **Authorization**: `require_auth()` is enforced on `deposit`, `withdraw`,
  and the `from` side of `confidential_transfer`, matching the auth model
  the real system will need.
- **Bookkeeping correctness**: balance arithmetic (checked addition,
  insufficient-balance checks, no negative balances) is fully implemented
  and tested — this logic does not change when real ZK proofs are added in
  Phase 2.
- **No amount in events**: `confidential_transfer` already only publishes
  sender/recipient addresses in its event, never the amount — even though
  Phase 1 could technically have included it. This is intentional, so
  Phase 2 does not require an event-schema migration.

## Planned changes by phase

| Phase | Change | Threat addressed |
|---|---|---|
| 2 | Replace plain `i128` balances with Pedersen commitments; replace mock proof with Bulletproofs range proofs | Storage inspection, proof forgery |
| 3 | Implement selective disclosure key derivation and verification | Enables compliant, opt-in transparency without weakening default privacy |
| 5 | Security review, resource/gas optimization, testnet integration tests | Hardening before any non-development use |
| 6 | External audit | Pre-mainnet assurance |

## Reporting

This is a development-phase project. There is no production deployment to
report vulnerabilities against yet. Once Phase 5 testnet deployment lands,
this section will be updated with a disclosure process.
