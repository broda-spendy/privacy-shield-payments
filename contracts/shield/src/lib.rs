//! Privacy-Shield Payments — Soroban contract.
//!
//! ⚠️ PHASE 1 SCAFFOLDING — see `docs/threat-model.md` ⚠️
//!
//! This contract's public interface is the intended final shape of the
//! product, but the cryptographic privacy guarantees are **not yet
//! implemented**. `proof.rs` mocks proof verification, and `disclosure.rs`
//! is fully stubbed. Do not deploy this beyond Stellar testnet for
//! development purposes.
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
use soroban_sdk::{contract, contractimpl, Address, Env};
use types::{DataKey, DisclosureKey, ProofKind, ShieldedAccount};

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
    pub fn deposit(env: Env, depositor: Address, amount: i128) -> Result<ShieldedAccount, ShieldError> {
        Self::require_initialized(&env)?;
        pool::deposit(&env, depositor, amount)
    }

    /// Withdraws `amount` from the caller's shielded balance.
    pub fn withdraw(env: Env, owner: Address, amount: i128) -> Result<ShieldedAccount, ShieldError> {
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
    pub fn confidential_transfer(
        env: Env,
        from: Address,
        to: Address,
        proof: ProofKind,
    ) -> Result<(), ShieldError> {
        Self::require_initialized(&env)?;
        transfer::confidential_transfer(&env, from, to, proof)
    }

    /// Records a disclosure request for a transfer.
    ///
    /// **Phase 1: not implemented**, always returns
    /// `Err(ShieldError::NotImplemented)`. See `disclosure.rs`.
    pub fn record_disclosure_request(
        env: Env,
        caller: Address,
        key: DisclosureKey,
    ) -> Result<(), ShieldError> {
        disclosure::record_disclosure_request(&env, caller, key)
    }

    /// Verifies a disclosure key against a recorded transfer.
    ///
    /// **Phase 1: not implemented**, always returns
    /// `Err(ShieldError::NotImplemented)`. See `disclosure.rs`.
    pub fn verify_disclosure(env: Env, key: DisclosureKey) -> Result<(), ShieldError> {
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
    fn disclosure_endpoints_are_not_implemented_in_phase_1() {
        let (env, _asset, client) = setup();
        let caller = Address::generate(&env);
        let key = DisclosureKey {
            transfer_id: BytesN::from_array(&env, &[1u8; 32]),
            viewing_key: BytesN::from_array(&env, &[1u8; 32]),
        };

        let record_result = client.try_record_disclosure_request(&caller, &key);
        assert_eq!(record_result, Err(Ok(ShieldError::NotImplemented)));

        let verify_result = client.try_verify_disclosure(&key);
        assert_eq!(verify_result, Err(Ok(ShieldError::NotImplemented)));
    }
}
