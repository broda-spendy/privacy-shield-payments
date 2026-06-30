//! Pool module: deposit into and withdraw from the shielded pool.
//!
//! This module contains no cryptography, so unlike `proof.rs` it is fully
//! implemented (not mocked) in Phase 1. Phase 2 will not need to change
//! this module's external behavior — only `transfer.rs` and `proof.rs`
//! gain real cryptography.

use crate::errors::ShieldError;
use crate::types::{DataKey, ShieldedAccount};
use soroban_sdk::{Address, Env};

/// Deposits `amount` into `depositor`'s shielded balance.
///
/// Phase 1 does not move the underlying Stellar Asset Contract token (that
/// integration is Phase 2+); this function only updates the contract's
/// internal shielded-balance bookkeeping, which is the part of the system
/// safe to build and test now.
pub fn deposit(
    env: &Env,
    depositor: Address,
    amount: i128,
) -> Result<ShieldedAccount, ShieldError> {
    depositor.require_auth();

    if amount <= 0 {
        return Err(ShieldError::InsufficientBalance);
    }

    let key = DataKey::Account(depositor.clone());
    let mut account = read_account(env, &depositor).unwrap_or(ShieldedAccount {
        owner: depositor.clone(),
        balance: 0,
    });

    account.balance = account
        .balance
        .checked_add(amount)
        .ok_or(ShieldError::InsufficientBalance)?;

    env.storage().instance().set(&key, &account);
    Ok(account)
}

/// Withdraws `amount` from `owner`'s shielded balance back to a
/// transparent balance (Phase 2+ wires the actual asset transfer; Phase 1
/// only validates and updates bookkeeping).
pub fn withdraw(env: &Env, owner: Address, amount: i128) -> Result<ShieldedAccount, ShieldError> {
    owner.require_auth();

    if amount <= 0 {
        return Err(ShieldError::InsufficientBalance);
    }

    let key = DataKey::Account(owner.clone());
    let mut account = read_account(env, &owner).ok_or(ShieldError::AccountNotFound)?;

    if account.balance < amount {
        return Err(ShieldError::InsufficientBalance);
    }

    account.balance -= amount;
    env.storage().instance().set(&key, &account);
    Ok(account)
}

/// Reads the shielded account for `owner`, if any.
pub fn read_account(env: &Env, owner: &Address) -> Option<ShieldedAccount> {
    let key = DataKey::Account(owner.clone());
    env.storage().instance().get(&key)
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    #[test]
    fn deposit_creates_new_account_with_correct_balance() {
        let env = Env::default();
        env.mock_all_auths();
        let depositor = Address::generate(&env);

        let account = deposit(&env, depositor.clone(), 500).unwrap();
        assert_eq!(account.balance, 500);
        assert_eq!(account.owner, depositor);
    }

    #[test]
    fn deposit_accumulates_into_existing_balance() {
        let env = Env::default();
        env.mock_all_auths();
        let depositor = Address::generate(&env);

        deposit(&env, depositor.clone(), 100).unwrap();
        let account = deposit(&env, depositor.clone(), 250).unwrap();
        assert_eq!(account.balance, 350);
    }

    #[test]
    fn deposit_rejects_zero_amount() {
        let env = Env::default();
        env.mock_all_auths();
        let depositor = Address::generate(&env);

        let result = deposit(&env, depositor, 0);
        assert_eq!(result, Err(ShieldError::InsufficientBalance));
    }

    #[test]
    fn deposit_rejects_negative_amount() {
        let env = Env::default();
        env.mock_all_auths();
        let depositor = Address::generate(&env);

        let result = deposit(&env, depositor, -50);
        assert_eq!(result, Err(ShieldError::InsufficientBalance));
    }

    #[test]
    fn withdraw_reduces_balance() {
        let env = Env::default();
        env.mock_all_auths();
        let owner = Address::generate(&env);

        deposit(&env, owner.clone(), 1000).unwrap();
        let account = withdraw(&env, owner.clone(), 400).unwrap();
        assert_eq!(account.balance, 600);
    }

    #[test]
    fn withdraw_fails_when_account_not_found() {
        let env = Env::default();
        env.mock_all_auths();
        let owner = Address::generate(&env);

        let result = withdraw(&env, owner, 100);
        assert_eq!(result, Err(ShieldError::AccountNotFound));
    }

    #[test]
    fn withdraw_fails_when_amount_exceeds_balance() {
        let env = Env::default();
        env.mock_all_auths();
        let owner = Address::generate(&env);

        deposit(&env, owner.clone(), 100).unwrap();
        let result = withdraw(&env, owner, 200);
        assert_eq!(result, Err(ShieldError::InsufficientBalance));
    }

    #[test]
    fn withdraw_rejects_zero_or_negative_amount() {
        let env = Env::default();
        env.mock_all_auths();
        let owner = Address::generate(&env);

        deposit(&env, owner.clone(), 100).unwrap();
        assert_eq!(
            withdraw(&env, owner.clone(), 0),
            Err(ShieldError::InsufficientBalance)
        );
        assert_eq!(
            withdraw(&env, owner, -10),
            Err(ShieldError::InsufficientBalance)
        );
    }

    #[test]
    fn read_account_returns_none_for_unknown_address() {
        let env = Env::default();
        let owner = Address::generate(&env);
        assert!(read_account(&env, &owner).is_none());
    }
}
