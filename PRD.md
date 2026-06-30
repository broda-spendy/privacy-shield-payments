# PRD — Privacy-Shield Payments

**Status:** Draft v1.0
**Owner:** broda-spendy
**Program:** Stellar Wave Program

## 1. Problem Statement

Stellar's ledger is, by design, fully transparent: every account balance and
every payment amount is public. This is a strength for auditability but a
hard blocker for enterprise and institutional adoption, where transaction
amounts, counterparties, and balances are commercially sensitive.

There is currently no production-ready, compliant way to move stablecoins on
Stellar without exposing the amount and parties involved to anyone watching
the ledger.

## 2. Goal

Build a dApp and supporting Soroban smart contract infrastructure that lets
users and enterprises send and receive stablecoins on Stellar with the
**amount, sender, and receiver shielded from public view**, while preserving:

- Cryptographic proof that the transfer is valid (no inflation, no double
  spend, sender had sufficient balance).
- **Selective disclosure**: a sender/receiver can reveal a transaction's
  details to a designated third party (e.g. an auditor or regulator) without
  exposing it to the public ledger.
- Stellar's normal settlement speed and cost characteristics.

## 3. Non-Goals (explicitly out of scope for this project, all phases)

- We are not building a new ZK proving system from scratch. We use existing
  cryptographic primitives (commitments, range proofs) and, when available,
  Stellar protocol-native ZK support.
- We are not building a fiat on/off-ramp.
- We are not building a full compliance/KYC product — selective disclosure is
  a primitive we expose, not a policy engine.
- We are not optimizing for mainnet deployment in Phase 1. All work targets
  Stellar **testnet** until explicitly promoted.

## 4. Users & Personas

| Persona | Need |
|---|---|
| Individual sender | Send stablecoins to another wallet without revealing amount on a public explorer |
| Enterprise treasury | Pay a vendor without disclosing deal size to competitors watching the chain |
| Auditor / regulator | Given a disclosure key by a party under investigation, verify a specific transaction's real amount and parties |
| Developer / integrator | Use a documented contract interface and SDK to add confidential transfers to their own app |

## 5. Core User Stories

1. As a sender, I can deposit stablecoin into a shielded pool contract and
   receive a confidential balance commitment.
2. As a sender, I can transfer a confidential amount to a recipient's
   shielded address; the public ledger shows that *a* transfer happened but
   not the amount.
3. As a recipient, I can see and spend my confidential balance in the
   wallet/UI.
4. As a sender or recipient, I can generate a disclosure proof for one
   specific transaction and share it with a chosen third party.
5. As an auditor with a valid disclosure proof, I can verify the real amount
   and parties of that one transaction, without gaining visibility into any
   other transaction.
6. As a developer, I can read `architecture.md` and the contract's public
   interface and integrate against it without reading the implementation.

## 6. Phased Delivery

### Phase 1 — Architecture & Scaffolding (THIS PHASE)
Repo structure, Soroban contract skeleton with the full public interface
defined but ZK proof verification **mocked/stubbed** (always returns valid,
clearly marked `UNSAFE_FOR_PRODUCTION`), basic in-memory/storage-backed
shielded balance bookkeeping, contract unit tests for the non-cryptographic
logic (deposits, transfer routing, disclosure record-keeping), CI scaffold,
and full documentation. No UI yet.

**Definition of done:** `cargo build` and `cargo test` succeed for the
contract workspace; architecture and interfaces are documented; repo has CI
that runs the test suite on push.

### Phase 2 — Real Confidential Amounts
Replace the mocked balance model with real Pedersen commitments for amounts.
Implement range proofs (e.g. Bulletproofs via `curve25519-dalek` /
`bulletproofs` crate, or Soroban-native equivalent if available) so a
transfer proves `amount >= 0` and `sender_balance - amount >= 0` without
revealing either value. Contract verifies proofs on-chain.

### Phase 3 — Selective Disclosure
Implement the disclosure-key mechanism: a sender can derive a
transaction-specific viewing key and share it out-of-band. Add a
verification utility (CLI or library) an auditor can run against that key
plus the public transaction record to recover and verify amount/parties.

### Phase 4 — Wallet / Web UI
Minimal React + Stellar wallet (Freighter) frontend: connect wallet, deposit
to shield pool, send confidential payment, view confidential balance,
generate/share a disclosure for a transaction.

### Phase 5 — Hardening & Testnet Deployment
Security review pass, gas/resource optimization on Soroban, deploy to
Stellar testnet, write integration tests against a live testnet contract,
load testing.

### Phase 6 — Mainnet Readiness
External audit engagement, mainnet deployment runbook, monitoring/alerting,
incident response plan.

## 7. Success Metrics (program-level)

- Phase 1: contract workspace builds and tests pass in CI; architecture doc
  reviewed and merged.
- Later phases: see individual phase issues.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Stellar Protocol 25 ZK primitives may not be stable/available in tooling yet | Phase 1–2 use library-based ZK (Bulletproofs) decoupled from protocol-native ZK; swap later if/when native support lands |
| Mocked proof verification in Phase 1 could be mistaken for production-ready | Mock functions are prefixed `UNSAFE_FOR_PRODUCTION`, return a typed `MockProof`, and the README has a prominent warning |
| Confidential balance bugs could lock or duplicate funds | Phase 1 keeps bookkeeping simple and fully tested; Phase 2 introduces proofs incrementally with property-based tests |
