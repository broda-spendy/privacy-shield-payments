//! Proof verification.
//!
//! ⚠️ PHASE 1 — UNSAFE_FOR_PRODUCTION ⚠️
//!
//! Everything in this module is scaffolding. `unsafe_for_production_verify`
//! performs no cryptography whatsoever and MUST NOT be relied on for any
//! privacy or correctness guarantee. It exists solely so that the rest of
//! the contract (transfer routing, error handling, event emission) can be
//! built, reviewed, and tested before the real ZK proof system lands in
//! Phase 2.
//!
//! See `docs/threat-model.md` for the full Phase 1 caveats and
//! `architecture.md` section 3.4 for the planned Phase 2 replacement
//! (Bulletproofs-based range proofs over Pedersen commitments).

use crate::types::ProofKind;

/// Verifies a `ProofKind`.
///
/// Dispatches to the appropriate verifier for the proof variant. In
/// Phase 1 the only variant is `ProofKind::Mock`, verified by
/// `unsafe_for_production_verify_mock`.
pub fn verify(proof: &ProofKind) -> bool {
    match proof {
        ProofKind::Mock(mock) => unsafe_for_production_verify_mock(mock),
    }
}

/// ⚠️ UNSAFE_FOR_PRODUCTION
///
/// Always returns `true` for any well-formed `MockProof` (positive amount,
/// present nonce). Performs **no cryptographic verification**. This is a
/// Phase 1 placeholder only — see module docs above.
fn unsafe_for_production_verify_mock(proof: &crate::types::MockProof) -> bool {
    proof.is_well_formed()
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::types::MockProof;
    use soroban_sdk::{Env, BytesN};

    #[test]
    fn well_formed_mock_proof_verifies() {
        let env = Env::default();
        let proof = ProofKind::Mock(MockProof {
            amount: 100,
            nonce: BytesN::from_array(&env, &[1u8; 32]),
        });
        assert!(verify(&proof));
    }

    #[test]
    fn zero_amount_mock_proof_fails_well_formedness() {
        let env = Env::default();
        let proof = ProofKind::Mock(MockProof {
            amount: 0,
            nonce: BytesN::from_array(&env, &[1u8; 32]),
        });
        assert!(!verify(&proof));
    }

    #[test]
    fn negative_amount_mock_proof_fails_well_formedness() {
        let env = Env::default();
        let proof = ProofKind::Mock(MockProof {
            amount: -5,
            nonce: BytesN::from_array(&env, &[1u8; 32]),
        });
        assert!(!verify(&proof));
    }
}
