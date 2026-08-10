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
use crate::types::{DataKey, ProofKind, ShieldedAccount, TransferRecord};
use soroban_sdk::xdr::ToXdr;
use soroban_sdk::{Address, Bytes, BytesN, Env, Symbol};

/// Derives the deterministic `transfer_id` committed to the ledger for a
/// transfer.
///
/// `transfer_id = SHA-256( xdr(from) || xdr(to) || nonce || amount_le )`.
/// It binds the parties, the proof nonce, and the amount to a single
/// identifier, and is unique with overwhelming probability for distinct
/// transfers that use distinct nonces.
///
/// Phase 3 caveat: this is a **binding** hash, not a **hiding** commitment.
/// An observer who knows `from`/`to`/`nonce` could brute-force small amounts
/// from the id. That is consistent with Phase 1/2, where the mock proof's
/// amount already travels in cleartext in the transaction — the transfer_id
/// exists to make disclosures addressable, and a real hiding scheme is
/// planned alongside the Phase 2 commitment work.
pub fn transfer_id_for(
    env: &Env,
    from: &Address,
    to: &Address,
    nonce: &BytesN<32>,
    amount: i128,
) -> BytesN<32> {
    let mut buf = Bytes::new(env);
    buf.append(&from.clone().to_xdr(env));
    buf.append(&to.clone().to_xdr(env));
    buf.append(&Bytes::from_slice(env, &nonce.to_array()));
    buf.append(&Bytes::from_slice(env, &amount.to_be_bytes()));
    env.crypto().sha256(&buf)
}

/// Reads the transfer record for a `transfer_id`, if one has been committed.
pub fn read_transfer_record(env: &Env, transfer_id: &BytesN<32>) -> Option<TransferRecord> {
    let key = DataKey::Transfer(transfer_id.clone());
    env.storage().instance().get(&key)
}

/// Performs a confidential transfer from `from` to `to`, authorized by a
/// `ProofKind`.
///
/// Returns the committed `transfer_id` on success. Emits a `transfer` event
/// containing the sender, recipient, and `transfer_id` — **never the
/// amount** — matching the eventual Phase 2 behavior where the amount would
/// not be available in cleartext to emit even if we wanted to. The
/// `transfer_id` lets a party to the transfer later register a disclosure
/// key (Phase 3).
pub fn confidential_transfer(
    env: &Env,
    from: Address,
    to: Address,
    proof: ProofKind,
) -> Result<BytesN<32>, ShieldError> {
    from.require_auth();

    if !proof::verify(&proof) {
        return Err(ShieldError::InvalidProof);
    }

    let (amount, nonce) = match &proof {
        ProofKind::Mock(mock) => (mock.amount, mock.nonce.clone()),
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

    let transfer_id = transfer_id_for(env, &from, &to, &nonce, amount);
    env.storage().instance().set(
        &DataKey::Transfer(transfer_id.clone()),
        &TransferRecord {
            transfer_id: transfer_id.clone(),
            from: from.clone(),
            to: to.clone(),
            amount,
        },
    );

    // Amount is deliberately excluded from the event topic/data; only the
    // opaque transfer_id is published so disclosures can be addressed.
    env.events().publish(
        (Symbol::new(env, "transfer"), from, to),
        transfer_id.clone(),
    );

    Ok(transfer_id)
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::pool::deposit;
    use crate::types::MockProof;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::testutils::Events;
    use soroban_sdk::{contract, contractimpl, BytesN, Env, TryFromVal};

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
    fn transfer_commits_a_transfer_id_and_record() {
        let (env, contract_id) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.as_contract(&contract_id, || {
            deposit(&env, alice.clone(), 1000).unwrap();
        });
        let transfer_id = env.as_contract(&contract_id, || {
            confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 300)).unwrap()
        });

        let record = env.as_contract(&contract_id, || {
            read_transfer_record(&env, &transfer_id).unwrap()
        });
        assert_eq!(record.amount, 300);
        assert_eq!(record.from, alice);
        assert_eq!(record.to, bob);
        assert_eq!(record.transfer_id, transfer_id);
    }

    #[test]
    fn transfer_id_is_deterministic_and_binds_party_nonce_amount() {
        let (env, contract_id) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.as_contract(&contract_id, || {
            deposit(&env, alice.clone(), 1000).unwrap();
        });

        let id_a = env.as_contract(&contract_id, || {
            confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 300)).unwrap()
        });
        // mock_all_auths authorizes an address once per frame; run each
        // transfer in its own invocation.
        let id_b = env.as_contract(&contract_id, || {
            confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 300)).unwrap()
        });
        // Same from/to/nonce/amount -> same id.
        assert_eq!(id_a, id_b);

        // A different amount produces a different id.
        env.as_contract(&contract_id, || {
            deposit(&env, alice.clone(), 2000).unwrap();
        });
        let id_c = env.as_contract(&contract_id, || {
            confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 301)).unwrap()
        });
        assert_ne!(id_a, id_c);
    }

    #[test]
    fn transfer_event_publishes_transfer_id_but_not_amount() {
        let (env, contract_id) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.as_contract(&contract_id, || {
            deposit(&env, alice.clone(), 1000).unwrap();
        });
        let transfer_id = env.as_contract(&contract_id, || {
            confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 300)).unwrap()
        });

        let events = env.events().all();
        assert_eq!(events.len(), 1);
        let (_, topics, data) = events.get(0).unwrap();

        // Topics: "transfer", from, to. Data: the transfer_id only.
        let topic0: Symbol = Symbol::try_from_val(&env, &topics.get(0).unwrap()).unwrap();
        let topic1: Address = Address::try_from_val(&env, &topics.get(1).unwrap()).unwrap();
        let topic2: Address = Address::try_from_val(&env, &topics.get(2).unwrap()).unwrap();
        let event_data: BytesN<32> = BytesN::try_from_val(&env, &data).unwrap();
        assert_eq!(topic0, Symbol::new(&env, "transfer"));
        assert_eq!(topic1, alice);
        assert_eq!(topic2, bob);
        assert_eq!(event_data, transfer_id);
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
            let result =
                confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 0));
            assert_eq!(result, Err(ShieldError::InvalidProof));
        });
    }

    #[test]
    fn transfer_fails_when_sender_has_no_account() {
        let (env, contract_id) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.as_contract(&contract_id, || {
            let result =
                confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 100));
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
            let result =
                confidential_transfer(&env, alice.clone(), bob.clone(), mock_proof(&env, 100));
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
