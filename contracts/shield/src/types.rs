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
    /// Transfer record, keyed by the SHA-256 `transfer_id` committed in the
    /// transfer event (Phase 3). Written by `confidential_transfer` so a
    /// party to a transfer can later register a disclosure for it.
    Transfer(BytesN<32>),
    /// Disclosure record, keyed by the transfer's `transfer_id` (Phase 3).
    /// Written by `record_disclosure_request`, read by `verify_disclosure`.
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

/// A disclosure key: the identifier of a specific transfer plus the viewing
/// key a party shares out-of-band. Used by `record_disclosure_request` and
/// `verify_disclosure` (Phase 3).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisclosureKey {
    pub transfer_id: BytesN<32>,
    pub viewing_key: BytesN<32>,
}

/// A record of a confidential transfer, stored under
/// `DataKey::Transfer(transfer_id)` (Phase 3).
///
/// The record exists so a party to a transfer can later register a
/// disclosure for it. It is **not** emitted in the transfer event — only the
/// `transfer_id` is — so the amount and counterparty stay out of public
/// event streams unless a disclosure is explicitly created.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferRecord {
    pub transfer_id: BytesN<32>,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
}

/// A disclosure record, stored under `DataKey::Disclosure(transfer_id)`
/// (Phase 3).
///
/// Only the SHA-256 hash of the viewing key is stored (never the key
/// itself), and only the amount and parties are revealed to a holder of the
/// correct key. See `docs/threat-model.md` for the Phase 3 caveat: the
/// binding is a hash commitment, not a hiding commitment — it binds the
/// record to a key but does not hide the amount from brute force on its own.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisclosureRecord {
    pub transfer_id: BytesN<32>,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub viewing_key_hash: BytesN<32>,
}
