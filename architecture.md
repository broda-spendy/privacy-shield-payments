# Architecture — Privacy-Shield Payments

**Status:** Draft v1.0 — reflects Phase 1 scaffolding

## 1. High-Level Overview

```
                          ┌─────────────────────────────┐
                          │         Web Client          │
                          │   (Phase 4 — not built yet) │
                          └──────────────┬───────────────┘
                                         │ Soroban RPC / SDK
                                         ▼
                          ┌─────────────────────────────┐
                          │     Soroban Smart Contract    │
                          │      (contracts/shield)       │
                          │                                │
                          │  ┌──────────────────────────┐  │
                          │  │   Pool Module             │  │
                          │  │  deposit / withdraw       │  │
                          │  └──────────────────────────┘  │
                          │  ┌──────────────────────────┐  │
                          │  │   Transfer Module          │  │
                          │  │  confidential_transfer     │  │
                          │  └──────────────────────────┘  │
                          │  ┌──────────────────────────┐  │
                          │  │   Proof Module (mocked)    │  │
                          │  │  verify_proof() -> bool    │  │
                          │  └──────────────────────────┘  │
                          │  ┌──────────────────────────┐  │
                          │  │   Disclosure Module        │  │
                          │  │  (Phase 3 — stubbed)        │  │
                          │  └──────────────────────────┘  │
                          └──────────────┬───────────────┘
                                         │
                                         ▼
                          ┌─────────────────────────────┐
                          │   Stellar Network (testnet)  │
                          └─────────────────────────────┘
```

## 2. Repository Layout

```
privacy-shield-payments/
├── PRD.md
├── architecture.md
├── README.md
├── CONTRIBUTING.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── contracts/
│   └── shield/                  # Soroban contract crate
│       ├── Cargo.toml
│       ├── src/
│       │   ├── lib.rs           # contract entrypoint, exports
│       │   ├── pool.rs          # deposit / withdraw / balances
│       │   ├── transfer.rs      # confidential_transfer logic
│       │   ├── proof.rs         # ZK proof interface + mock impl
│       │   ├── disclosure.rs    # selective disclosure (stubbed)
│       │   ├── types.rs         # shared types (ShieldedAccount, Proof, etc.)
│       │   ├── errors.rs        # contract error enum
│       │   └── test.rs          # unit tests
│       └── README.md
├── docs/
│   ├── interface.md             # public contract interface reference
│   └── threat-model.md          # privacy/security assumptions, Phase 1 caveats
└── Cargo.toml                   # workspace root
```

Future phases add `frontend/` (Phase 4), `sdk/` (developer integration
library, introduced alongside Phase 4), and `scripts/deploy/` (Phase 5).

## 3. Contract Design (Phase 1)

### 3.1 Core types (`types.rs`)

- `ShieldedAccount` — maps a Stellar address to an opaque balance commitment.
  In Phase 1 this commitment is **a plain `i128` wrapped in a struct**, not a
  real cryptographic commitment — this is intentional scaffolding, replaced
  in Phase 2.
- `Proof` — a trait-like enum `ProofKind::Mock(MockProof)` for Phase 1;
  Phase 2 adds `ProofKind::Bulletproof(...)`.
- `DisclosureKey` — placeholder type, unused logic in Phase 1, real
  implementation in Phase 3.

### 3.2 Pool Module (`pool.rs`)

- `deposit(env, depositor: Address, amount: i128) -> ShieldedAccount`
  Locks `amount` of the underlying stablecoin (Stellar Asset Contract) into
  the pool and credits the depositor's shielded balance.
- `withdraw(env, account: Address, amount: i128)`
  Reverses a deposit, unshielding back to a transparent Stellar balance.

Phase 1 implements deposit/withdraw bookkeeping with full storage
read/write logic — this is **not** mocked, since it contains no
cryptography and is the part most worth getting right early.

### 3.3 Transfer Module (`transfer.rs`)

- `confidential_transfer(env, from: Address, to: Address, proof: Proof) -> Result<(), ShieldError>`
  In Phase 1: takes a `Proof::Mock` value, calls `proof::verify(proof)`
  (always `true` for a well-formed mock), and if valid, moves a contract-
  internal "shielded balance unit" from `from` to `to` **without ever
  exposing the amount in an event or return value**. The actual amount
  routing in Phase 1 is intentionally simplified (see `proof.rs` below) —
  Phase 2 wires in real commitment arithmetic.

### 3.4 Proof Module (`proof.rs`)

This is the explicitly mocked piece for Phase 1.

```rust
/// ⚠️ UNSAFE_FOR_PRODUCTION
/// This mock always returns `true` for any well-formed MockProof and
/// performs **no cryptographic verification whatsoever**. It exists only
/// to let the rest of the contract's control flow be built, tested, and
/// reviewed in Phase 1. It MUST be replaced before any non-test deployment.
pub fn unsafe_for_production_verify_mock(proof: &MockProof) -> bool {
    proof.is_well_formed()
}
```

The module defines the **interface** Phase 2's real proof verifier will
implement (`verify(proof: &Proof, public_inputs: &PublicInputs) -> bool`),
so swapping in Bulletproofs later is a drop-in replacement, not a redesign.

### 3.5 Disclosure Module (`disclosure.rs`)

Phase 1 stubs the function signatures and storage shape only:

- `record_disclosure_request(...)` — no-op, returns `Err(NotImplemented)`
- `verify_disclosure(...)` — no-op, returns `Err(NotImplemented)`

This lets `docs/interface.md` document the eventual full public interface
now, even though Phase 3 implements the logic.

### 3.6 Errors (`errors.rs`)

A single `ShieldError` enum covering: `InsufficientBalance`,
`InvalidProof`, `AccountNotFound`, `NotImplemented`, `Unauthorized`.

## 4. Security & Privacy Posture (Phase 1)

**This phase ships zero real privacy guarantees.** Balances and transfer
amounts are technically held in contract storage as plain integers. The
public contract interface is privacy-shaped (no amount is returned from
`confidential_transfer`, no amount appears in emitted events), but anyone
with contract read access could, in principle, inspect storage directly in
this phase. `docs/threat-model.md` documents this explicitly so it is never
mistaken for a finished privacy product.

Phase 2 closes this gap with real commitments and range proofs.

## 5. Testing Strategy

- Phase 1: unit tests for pool deposit/withdraw arithmetic, transfer routing
  with mock proofs (both well-formed and malformed), error paths, and
  storage state assertions. Run via `cargo test` inside `contracts/shield`.
- CI (`ci.yml`): on every push/PR, runs `cargo build --workspace` and
  `cargo test --workspace`.

## 6. Open Questions (tracked as Phase 2+ issues)

- Which ZK toolkit to standardize on for Phase 2 (Bulletproofs via
  `curve25519-dalek`, vs. waiting on Stellar Protocol 25 native primitives)
  — see the PRD risk table.
- Disclosure key derivation scheme (Phase 3) — likely a deterministic
  sub-key derived from the sender's transfer-specific ephemeral key, TBD.
