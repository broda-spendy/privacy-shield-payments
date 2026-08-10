//! Selective disclosure module (Phase 3).
//!
//! Enables a party to a confidential transfer to register a disclosure key
//! for that transfer and later share it out-of-band (auditor, regulator,
//! counterparty reconciliation) so the holder can verify the transfer's real
//! amount and parties — **without** gaining visibility into any other
//! transfer.
//!
//! # Privacy guarantees
//!
//! - Only a party to the transfer (`TransferRecord.from` or `TransferRecord.to`)
//!   may register a disclosure for it.
//! - The viewing key is never stored; only `SHA-256(viewing_key)` is kept, so
//!   instance storage does not leak keys.
//! - `verify_disclosure` keys strictly on `transfer_id`, so a valid key for one
//!   transfer cannot open any other.
//!
//! # Phase 3 caveat
//!
//! The `transfer_id` is a *binding* hash commitment over
//! `(from, to, nonce, amount)`, not a *hiding* commitment (see
//! `transfer::transfer_id_for`). The disclosure record binds a key to a
//! transfer; it does not by itself hide the amount from an offline brute force.
//! A real hiding scheme is tracked alongside the Phase 2 commitment work.

use crate::errors::ShieldError;
use crate::transfer::read_transfer_record;
use crate::types::{DataKey, DisclosureKey, DisclosureRecord};
use soroban_sdk::{Address, Bytes, Env};

/// Records a disclosure request for a given transfer, allowing the caller
/// to later share `key` with a third party so they can verify the
/// transfer's real amount and parties.
///
/// Requires the caller to be a party to the transfer. Calling this again
/// with a new viewing key for the same transfer rotates the key (the
/// previous key stops working).
pub fn record_disclosure_request(
    env: &Env,
    caller: Address,
    key: DisclosureKey,
) -> Result<(), ShieldError> {
    caller.require_auth();

    let record =
        read_transfer_record(env, &key.transfer_id).ok_or(ShieldError::TransferNotFound)?;

    if caller != record.from && caller != record.to {
        return Err(ShieldError::Unauthorized);
    }

    let viewing_key_hash = env
        .crypto()
        .sha256(&Bytes::from_slice(env, &key.viewing_key.to_array()));

    env.storage().instance().set(
        &DataKey::Disclosure(key.transfer_id.clone()),
        &DisclosureRecord {
            transfer_id: key.transfer_id,
            from: record.from,
            to: record.to,
            amount: record.amount,
            viewing_key_hash,
        },
    );

    Ok(())
}

/// Verifies a disclosure: given a `DisclosureKey`, returns the real
/// transfer amount and parties if the key is valid for a recorded
/// transfer.
///
/// The holder learns only the disclosed transfer — the key is bound to the
/// `transfer_id` and to the hashed viewing key, so it cannot read any other
/// transfer in the pool.
pub fn verify_disclosure(env: &Env, key: DisclosureKey) -> Result<DisclosureRecord, ShieldError> {
    let disclosure: DisclosureRecord = env
        .storage()
        .instance()
        .get(&DataKey::Disclosure(key.transfer_id.clone()))
        .ok_or(ShieldError::DisclosureNotFound)?;

    let viewing_key_hash = env
        .crypto()
        .sha256(&Bytes::from_slice(env, &key.viewing_key.to_array()));
    if viewing_key_hash != disclosure.viewing_key_hash {
        return Err(ShieldError::InvalidDisclosureKey);
    }

    Ok(disclosure)
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::types::{MockProof, ProofKind};
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

    fn setup() -> (Env, Address, Address, Address, BytesN<32>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, DummyContract);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        env.as_contract(&contract_id, || {
            crate::pool::deposit(&env, alice.clone(), 1000).unwrap();
        });
        let transfer_id = env.as_contract(&contract_id, || {
            crate::transfer::confidential_transfer(
                &env,
                alice.clone(),
                bob.clone(),
                ProofKind::Mock(MockProof {
                    amount: 300,
                    nonce: BytesN::from_array(&env, &[7u8; 32]),
                }),
            )
            .unwrap()
        });
        (env, contract_id, alice, bob, transfer_id)
    }

    fn key(env: &Env, transfer_id: &BytesN<32>, seed: u8) -> DisclosureKey {
        DisclosureKey {
            transfer_id: transfer_id.clone(),
            viewing_key: BytesN::from_array(env, &[seed; 32]),
        }
    }

    #[test]
    fn record_and_verify_roundtrip() {
        let (env, contract_id, alice, bob, transfer_id) = setup();
        let disclosure_key = key(&env, &transfer_id, 42);

        env.as_contract(&contract_id, || {
            record_disclosure_request(&env, alice.clone(), disclosure_key.clone()).unwrap();
            let record = verify_disclosure(&env, disclosure_key.clone()).unwrap();
            assert_eq!(record.amount, 300);
            assert_eq!(record.from, alice);
            assert_eq!(record.to, bob);
            assert_eq!(record.transfer_id, transfer_id);
        });
    }

    #[test]
    fn verify_fails_with_wrong_viewing_key() {
        let (env, contract_id, alice, _bob, transfer_id) = setup();
        let disclosure_key = key(&env, &transfer_id, 42);

        env.as_contract(&contract_id, || {
            record_disclosure_request(&env, alice.clone(), disclosure_key.clone()).unwrap();
            let wrong = key(&env, &transfer_id, 43);
            let result = verify_disclosure(&env, wrong);
            assert_eq!(result, Err(ShieldError::InvalidDisclosureKey));
        });
    }

    #[test]
    fn verify_fails_when_no_disclosure_recorded() {
        let (env, contract_id, _alice, _bob, transfer_id) = setup();
        let disclosure_key = key(&env, &transfer_id, 42);

        env.as_contract(&contract_id, || {
            let result = verify_disclosure(&env, disclosure_key);
            assert_eq!(result, Err(ShieldError::DisclosureNotFound));
        });
    }

    #[test]
    fn record_fails_when_transfer_does_not_exist() {
        let (env, contract_id, alice, _bob, _transfer_id) = setup();
        let ghost = key(&env, &BytesN::from_array(&env, &[99u8; 32]), 42);

        env.as_contract(&contract_id, || {
            let result = record_disclosure_request(&env, alice, ghost);
            assert_eq!(result, Err(ShieldError::TransferNotFound));
        });
    }

    #[test]
    fn record_fails_for_non_party() {
        let (env, contract_id, alice, _bob, transfer_id) = setup();
        let disclosure_key = key(&env, &transfer_id, 42);
        let mallory = Address::generate(&env);

        env.as_contract(&contract_id, || {
            let result = record_disclosure_request(&env, mallory, disclosure_key);
            assert_eq!(result, Err(ShieldError::Unauthorized));
            // The non-party attempt recorded nothing; the party can still record.
            record_disclosure_request(&env, alice, key(&env, &transfer_id, 42)).unwrap();
        });
    }

    #[test]
    fn re_recording_rotates_the_viewing_key() {
        let (env, contract_id, alice, _bob, transfer_id) = setup();
        let old_key = key(&env, &transfer_id, 42);
        let new_key = key(&env, &transfer_id, 43);

        // mock_all_auths authorizes an address once per frame; run each
        // record call in its own invocation.
        env.as_contract(&contract_id, || {
            record_disclosure_request(&env, alice.clone(), old_key.clone()).unwrap();
        });
        env.as_contract(&contract_id, || {
            assert!(verify_disclosure(&env, old_key.clone()).is_ok());
        });

        // Rotate: the old key must stop working.
        env.as_contract(&contract_id, || {
            record_disclosure_request(&env, alice.clone(), new_key.clone()).unwrap();
        });
        env.as_contract(&contract_id, || {
            let result = verify_disclosure(&env, old_key);
            assert_eq!(result, Err(ShieldError::InvalidDisclosureKey));
            assert!(verify_disclosure(&env, new_key).is_ok());
        });
    }

    #[test]
    fn viewing_key_is_not_stored_in_cleartext() {
        let (env, contract_id, alice, _bob, transfer_id) = setup();
        let disclosure_key = key(&env, &transfer_id, 42);
        let raw_viewing_key = disclosure_key.viewing_key.clone();

        env.as_contract(&contract_id, || {
            record_disclosure_request(&env, alice.clone(), disclosure_key).unwrap();
            let stored: DisclosureRecord = env
                .storage()
                .instance()
                .get(&DataKey::Disclosure(transfer_id.clone()))
                .unwrap();
            // The raw key bytes must not appear in the stored record.
            assert_ne!(stored.viewing_key_hash, raw_viewing_key);
            // ...but the recomputed hash matches (already proven by the
            // roundtrip test); assert the hash is a sha256, i.e. 32 bytes.
            assert_eq!(stored.viewing_key_hash.len(), 32);
        });
    }
}
