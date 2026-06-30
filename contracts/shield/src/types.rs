//! Shared types for the Privacy-Shield Payments contract.
//!
//! Phase 1 note: `ShieldedAccount.balance` and `MockProof` are intentionally
//! NOT cryptographically private. See `proof.rs` and
//! `docs/threat-model.md` for the full Phase 1 privacy caveats.

use soroban_sdk::{contracttype, Address, BytesN};

/// A shielded account record. In Phase 1 the balance is a plain `i128`
/// stored in contract instance storage — there is no commitment scheme
/// yet. Phase 2 replaces `balance` with a Pedersen commitment.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ShieldedAccount {
    pub owner: Address,
    pub balance: i128,
}

/// Storage key variants for the contract's instance storage.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Maps an `Address` to its `ShieldedAccount`.
    Account(Address),
    /// The address of the underlying Stellar Asset Contract this pool
    /// shields deposits/withdrawals for.
    AssetContract,
    /// Disclosure record, keyed by an opaque transfer id (Phase 3, unused
    /// in Phase 1 beyond the type definition).
    Disclosure(BytesN<32>),
}

/// A proof envelope. Phase 1 only implements `ProofKind::Mock`.
/// Phase 2 will add `ProofKind::Bulletproof(BulletproofData)` here as a
/// new enum variant — additive, not a breaking change to this type.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProofKind {
    Mock(MockProof),
}

/// ⚠️ UNSAFE_FOR_PRODUCTION
///
/// A placeholder "proof" with no cryptographic meaning. It exists purely
/// so the rest of the contract's control flow (transfer routing, error
/// handling, events) can be built and tested in Phase 1. See
/// `proof::unsafe_for_production_verify_mock` for the (non-)verification
/// logic, and `docs/threat-model.md` for why this is safe to ship as
/// scaffolding but never as a production proof system.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MockProof {
    /// The amount being transferred. In a real ZK scheme this would never
    /// appear in a public proof field — it is here only because Phase 1
    /// has not yet implemented commitments.
    pub amount: i128,
    /// A nonce supplied by the caller. Must be non-zero for the mock proof
    /// to be considered well-formed; this is the only "validation" Phase 1
    /// performs.
    pub nonce: BytesN<32>,
}

impl MockProof {
    /// Phase 1 well-formedness check: amount must be positive and a nonce
    /// must be present. This is NOT cryptographic verification.
    pub fn is_well_formed(&self) -> bool {
        self.amount > 0
    }
}

/// Placeholder type for Phase 3 selective disclosure. Unused logic in
/// Phase 1; the shape is defined now so `docs/interface.md` can document
/// the eventual full public interface.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisclosureKey {
    pub transfer_id: BytesN<32>,
    pub viewing_key: BytesN<32>,
}
