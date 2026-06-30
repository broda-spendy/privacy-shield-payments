//! Transfer module: routes a confidential transfer between two shielded
//! accounts.
//!
//! Phase 1 caveat: because `proof.rs` is mocked, the "amount" used to move
//! balance between accounts is read directly from the `MockProof` rather
//! than derived from a verified commitment. This is intentional — see
//! `docs/threat-model.md`. The *routing logic* (auth checks, balance
//! checks, error handling, no-amount-in-events) is real and is what Phase 1
//! is meant to validate.

use crate::errors::ShieldError;
use crate::pool::read_account;
use crate::proof;
use crate::types::{DataKey, ProofKind, ShieldedAccount};
use soroban_sdk::{Address, Env, Symbol};

/// Performs a confidential transfer from `from` to `to`, authorized by a
/// `ProofKind`.
///
/// Returns `Ok(())` on success. Emits a `transfer` event containing only
/// the sender and recipient addresses — **never the amount** — matching
/// the eventual Phase 2 behavior where the amount would not be available
/// in cleartext to emit even if we wanted to.
pub fn confidential_transfer(
    env: &Env,
    from: Address,
    to: Address,
    proof: ProofKind,
) -> Result<(), ShieldError> {
    from.require_auth();

    if !proof::verify(&proof) {
        return Err(ShieldError::InvalidProof);
    }

    let amount = match &proof {
        ProofKind::Mock(mock) => mock.amount,
    };

    let mut from_account = read_account(env, &from).ok_or(ShieldError::AccountNotFound)?;
    if from_account.balance < amount {
        return Err(ShieldError::InsufficientBalance);
    }

    let mut to_account = read_account(env, &to).unwrap_or(ShieldedAccount {
        owner: to.clone(),
        balance: 0,
    });

    from_account.balance -= amount;
    to_account.balance = to_account
        .balance
        .checked_add(amount)
        .ok_or(ShieldError::InsufficientBalance)?;

    env.storage()
        .instance()
        .set(&DataKey::Account(from.clone()), &from_account);
    env.storage()
        .instance()
        .set(&DataKey::Account(to.clone()), &to_account);

    // Amount is deliberately excluded from the event topic/data.
    env.events()
        .publish((Symbol::new(env, "transfer"), from, to), ());

    Ok(())
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::pool::deposit;
    use crate::types::MockProof;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{contract, contractimpl, BytesN, Env};

    /// See `pool.rs` test module docs for why a dummy contract + `as_contract`
    /// wrapper is used here.
    #[contract]
    struct DummyContract;

    #[contractimpl]
    impl DummyContract {
        pub fn noop(_env: Env) {}
    }

    fn setup() -> (Env, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, DummyContract);
        (env, contract_id)
    }

    fn mock_proof(env: &Env, amount: i128) -> ProofKind {
        ProofKind::Mock(MockProof {
            amount,
            nonce: BytesN::from_array(env, &[7u8; 32]),
        })
    }

    #[test]
    fn transfer_moves_balance_between_accounts() {
        let (env, contract_id) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.as_contract(&contract_id, || {
            deposit(&env, alice.clone(), 1000).unwrap();
        });
        env.as_contract(&contract_id, || {
            confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 300)).unwrap();
        });

        env.as_contract(&contract_id, || {
            assert_eq!(read_account(&env, &alice).unwrap().balance, 700);
            assert_eq!(read_account(&env, &bob).unwrap().balance, 300);
        });
    }

    #[test]
    fn transfer_to_new_recipient_creates_their_account() {
        let (env, contract_id) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.as_contract(&contract_id, || {
            deposit(&env, alice.clone(), 500).unwrap();
        });
        env.as_contract(&contract_id, || {
            confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 500)).unwrap();
        });

        env.as_contract(&contract_id, || {
            assert_eq!(read_account(&env, &bob).unwrap().balance, 500);
        });
    }

    #[test]
    fn transfer_fails_with_invalid_proof() {
        let (env, contract_id) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.as_contract(&contract_id, || {
            deposit(&env, alice.clone(), 1000).unwrap();
        });
        env.as_contract(&contract_id, || {
            // amount <= 0 is not well-formed -> InvalidProof
            let result = confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 0));
            assert_eq!(result, Err(ShieldError::InvalidProof));
        });
    }

    #[test]
    fn transfer_fails_when_sender_has_no_account() {
        let (env, contract_id) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.as_contract(&contract_id, || {
            let result = confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 100));
            assert_eq!(result, Err(ShieldError::AccountNotFound));
        });
    }

    #[test]
    fn transfer_fails_when_sender_balance_insufficient() {
        let (env, contract_id) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.as_contract(&contract_id, || {
            deposit(&env, alice.clone(), 50).unwrap();
        });
        env.as_contract(&contract_id, || {
            let result = confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 100));
            assert_eq!(result, Err(ShieldError::InsufficientBalance));
        });
    }

    #[test]
    fn transfer_does_not_change_balances_on_failure() {
        let (env, contract_id) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.as_contract(&contract_id, || {
            deposit(&env, alice.clone(), 50).unwrap();
        });
        env.as_contract(&contract_id, || {
            let _ = confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 100));
        });

        env.as_contract(&contract_id, || {
            assert_eq!(read_account(&env, &alice).unwrap().balance, 50);
            assert!(read_account(&env, &bob).is_none());
        });
    }
}
