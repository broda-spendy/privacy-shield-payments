//! Privacy-Shield Payments — Soroban contract.
//!
//! ⚠️ PHASE 1 SCAFFOLDING — see `docs/threat-model.md` ⚠️
//!
//! This contract's public interface is the intended final shape of the
//! product, but the cryptographic privacy guarantees are **not yet
//! implemented**. `proof.rs` mocks proof verification. Do not deploy this
//! beyond Stellar testnet for development purposes.
//!
//! See `architecture.md` for the full design and `PRD.md` for the phased
//! roadmap.

#![no_std]

mod disclosure;
mod errors;
mod pool;
mod proof;
mod transfer;
mod types;

use errors::ShieldError;
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env};
use types::{DataKey, DisclosureKey, DisclosureRecord, ProofKind, ShieldedAccount};

#[contract]
pub struct ShieldContract;

#[contractimpl]
impl ShieldContract {
    /// One-time contract initialization. Records the underlying Stellar
    /// Asset Contract address this pool shields deposits/withdrawals for.
    ///
    /// Phase 1 stores the address but does not yet use it for real token
    /// transfers (see `pool.rs` module docs).
    pub fn initialize(env: Env, asset_contract: Address) -> Result<(), ShieldError> {
        if env.storage().instance().has(&DataKey::AssetContract) {
            return Err(ShieldError::AlreadyInitialized);
        }
        env.storage()
            .instance()
            .set(&DataKey::AssetContract, &asset_contract);
        Ok(())
    }

    /// Deposits `amount` into the caller's shielded balance.
    pub fn deposit(
        env: Env,
        depositor: Address,
        amount: i128,
    ) -> Result<ShieldedAccount, ShieldError> {
        Self::require_initialized(&env)?;
        pool::deposit(&env, depositor, amount)
    }

    /// Withdraws `amount` from the caller's shielded balance.
    pub fn withdraw(
        env: Env,
        owner: Address,
        amount: i128,
    ) -> Result<ShieldedAccount, ShieldError> {
        Self::require_initialized(&env)?;
        pool::withdraw(&env, owner, amount)
    }

    /// Returns the shielded account for `owner`, if one exists.
    pub fn balance(env: Env, owner: Address) -> Option<ShieldedAccount> {
        pool::read_account(&env, &owner)
    }

    /// Performs a confidential transfer from `from` to `to`, authorized by
    /// `proof`.
    ///
    /// Phase 1: `proof` must be `ProofKind::Mock`; see `proof.rs` for the
    /// (non-cryptographic) verification performed.
    ///
    /// Returns the committed `transfer_id` (a SHA-256 of the parties, proof
    /// nonce, and amount), which a party to the transfer can later use to
    /// register a disclosure key — see `record_disclosure_request`.
    pub fn confidential_transfer(
        env: Env,
        from: Address,
        to: Address,
        proof: ProofKind,
    ) -> Result<BytesN<32>, ShieldError> {
        Self::require_initialized(&env)?;
        transfer::confidential_transfer(&env, from, to, proof)
    }

    /// Records a disclosure request for a transfer (Phase 3).
    ///
    /// Only a party to the transfer (`record.from` or `record.to`) may
    /// register a disclosure. Only the SHA-256 hash of the viewing key is
    /// stored. A later `verify_disclosure` call with the same key reveals
    /// the transfer's amount and parties.
    ///
    /// Calling this twice for the same transfer rotates the key: the
    /// previous viewing key stops working.
    pub fn record_disclosure_request(
        env: Env,
        caller: Address,
        key: DisclosureKey,
    ) -> Result<(), ShieldError> {
        disclosure::record_disclosure_request(&env, caller, key)
    }

    /// Verifies a disclosure key against a recorded transfer (Phase 3).
    ///
    /// Reveals the amount and parties of the transfer identified by
    /// `key.transfer_id`, provided a disclosure was recorded for it and
    /// `key.viewing_key` matches. The holder sees only this transfer — the
    /// key cannot be used to read any other transfer.
    pub fn verify_disclosure(
        env: Env,
        key: DisclosureKey,
    ) -> Result<DisclosureRecord, ShieldError> {
        disclosure::verify_disclosure(&env, key)
    }

    fn require_initialized(env: &Env) -> Result<(), ShieldError> {
        if !env.storage().instance().has(&DataKey::AssetContract) {
            return Err(ShieldError::NotInitialized);
        }
        Ok(())
    }
}

#[cfg(test)]
mod contract_test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{BytesN, Env};
    use types::MockProof;

    fn setup() -> (Env, Address, ShieldContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, ShieldContract);
        let client = ShieldContractClient::new(&env, &contract_id);
        let asset_contract = Address::generate(&env);
        client.initialize(&asset_contract);
        (env, asset_contract, client)
    }

    #[test]
    fn initialize_can_only_run_once() {
        let (env, _asset, client) = setup();
        let asset_contract2 = Address::generate(&env);
        let result = client.try_initialize(&asset_contract2);
        assert_eq!(result, Err(Ok(ShieldError::AlreadyInitialized)));
    }

    #[test]
    fn deposit_then_balance_roundtrip() {
        let (env, _asset, client) = setup();
        let user = Address::generate(&env);

        client.deposit(&user, &1000);
        let account = client.balance(&user).unwrap();
        assert_eq!(account.balance, 1000);
    }

    #[test]
    fn operations_fail_before_initialize() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, ShieldContract);
        let client = ShieldContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);

        let result = client.try_deposit(&user, &100);
        assert_eq!(result, Err(Ok(ShieldError::NotInitialized)));
    }

    #[test]
    fn end_to_end_confidential_transfer() {
        let (env, _asset, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.deposit(&alice, &1000);

        let proof = ProofKind::Mock(MockProof {
            amount: 250,
            nonce: BytesN::from_array(&env, &[9u8; 32]),
        });
        client.confidential_transfer(&alice, &bob, &proof);

        assert_eq!(client.balance(&alice).unwrap().balance, 750);
        assert_eq!(client.balance(&bob).unwrap().balance, 250);
    }

    #[test]
    fn disclosure_end_to_end_flow() {
        let (env, _asset, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.deposit(&alice, &1000);

        let transfer_id = client.confidential_transfer(
            &alice,
            &bob,
            &ProofKind::Mock(MockProof {
                amount: 250,
                nonce: BytesN::from_array(&env, &[9u8; 32]),
            }),
        );

        let viewing_key = BytesN::from_array(&env, &[42u8; 32]);
        let key = DisclosureKey {
            transfer_id: transfer_id.clone(),
            viewing_key: viewing_key.clone(),
        };

        // Sender records a disclosure; the recipient's own audit tool can
        // then verify it out-of-band.
        client.record_disclosure_request(&alice, &key);

        let record = client.verify_disclosure(&key);
        assert_eq!(record.amount, 250);
        assert_eq!(record.from, alice);
        assert_eq!(record.to, bob);
        assert_eq!(record.transfer_id, transfer_id);
    }

    #[test]
    fn disclosure_requires_being_a_party_to_the_transfer() {
        let (env, _asset, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let mallory = Address::generate(&env);

        client.deposit(&alice, &1000);

        let transfer_id = client.confidential_transfer(
            &alice,
            &bob,
            &ProofKind::Mock(MockProof {
                amount: 250,
                nonce: BytesN::from_array(&env, &[9u8; 32]),
            }),
        );

        let key = DisclosureKey {
            transfer_id: transfer_id.clone(),
            viewing_key: BytesN::from_array(&env, &[42u8; 32]),
        };
        let result = client.try_record_disclosure_request(&mallory, &key);
        assert_eq!(result, Err(Ok(ShieldError::Unauthorized)));
    }

    #[test]
    fn disclosure_fails_for_unknown_transfer_or_wrong_key() {
        let (env, _asset, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.deposit(&alice, &1000);

        let transfer_id = client.confidential_transfer(
            &alice,
            &bob,
            &ProofKind::Mock(MockProof {
                amount: 250,
                nonce: BytesN::from_array(&env, &[9u8; 32]),
            }),
        );

        // Verifying before any disclosure is recorded.
        let key = DisclosureKey {
            transfer_id: transfer_id.clone(),
            viewing_key: BytesN::from_array(&env, &[42u8; 32]),
        };
        let result = client.try_verify_disclosure(&key);
        assert_eq!(result, Err(Ok(ShieldError::DisclosureNotFound)));

        // Recording a disclosure for a transfer that does not exist.
        let ghost_key = DisclosureKey {
            transfer_id: BytesN::from_array(&env, &[99u8; 32]),
            viewing_key: BytesN::from_array(&env, &[42u8; 32]),
        };
        let result = client.try_record_disclosure_request(&alice, &ghost_key);
        assert_eq!(result, Err(Ok(ShieldError::TransferNotFound)));

        // Recording with a valid transfer but verifying with a wrong key.
        client.record_disclosure_request(&alice, &key);
        let wrong_key = DisclosureKey {
            transfer_id: transfer_id.clone(),
            viewing_key: BytesN::from_array(&env, &[43u8; 32]),
        };
        let result = client.try_verify_disclosure(&wrong_key);
        assert_eq!(result, Err(Ok(ShieldError::InvalidDisclosureKey)));
    }

    #[test]
    fn disclosure_keys_are_scoped_to_a_single_transfer() {
        let (env, _asset, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);

        client.deposit(&alice, &1000);

        let transfer_ab = client.confidential_transfer(
            &alice,
            &bob,
            &ProofKind::Mock(MockProof {
                amount: 250,
                nonce: BytesN::from_array(&env, &[9u8; 32]),
            }),
        );
        let transfer_ac = client.confidential_transfer(
            &alice,
            &carol,
            &ProofKind::Mock(MockProof {
                amount: 400,
                nonce: BytesN::from_array(&env, &[8u8; 32]),
            }),
        );
        assert_ne!(transfer_ab, transfer_ac);

        // A key that discloses transfer A->B reveals only that transfer.
        let key_ab = DisclosureKey {
            transfer_id: transfer_ab.clone(),
            viewing_key: BytesN::from_array(&env, &[42u8; 32]),
        };
        client.record_disclosure_request(&alice, &key_ab);
        let record = client.verify_disclosure(&key_ab);
        assert_eq!(record.amount, 250);
        assert_eq!(record.to, bob);

        // The same key cannot read transfer A->C.
        let misuse = DisclosureKey {
            transfer_id: transfer_ac.clone(),
            viewing_key: BytesN::from_array(&env, &[42u8; 32]),
        };
        let result = client.try_verify_disclosure(&misuse);
        assert_eq!(result, Err(Ok(ShieldError::DisclosureNotFound)));
    }

    #[test]
    fn receiver_can_also_record_a_disclosure() {
        let (env, _asset, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.deposit(&alice, &1000);

        let transfer_id = client.confidential_transfer(
            &alice,
            &bob,
            &ProofKind::Mock(MockProof {
                amount: 250,
                nonce: BytesN::from_array(&env, &[9u8; 32]),
            }),
        );

        let key = DisclosureKey {
            transfer_id: transfer_id.clone(),
            viewing_key: BytesN::from_array(&env, &[42u8; 32]),
        };
        client.record_disclosure_request(&bob, &key);
        let record = client.verify_disclosure(&key);
        assert_eq!(record.amount, 250);
        assert_eq!(record.from, alice);
    }
}
