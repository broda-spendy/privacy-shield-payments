//! Selective disclosure module.
//!
//! **Phase 1 status: STUBBED, NOT IMPLEMENTED.**
//!
//! These function signatures exist now so the full public interface can be
//! documented in `docs/interface.md` and so Phase 3 can implement the
//! bodies without changing the contract's external shape. Every function
//! here returns `Err(ShieldError::NotImplemented)`.

use crate::errors::ShieldError;
use crate::types::DisclosureKey;
use soroban_sdk::{Address, Env};

/// Records a disclosure request for a given transfer, allowing the caller
/// to later share `key` with a third party so they can verify the
/// transfer's real amount and parties.
///
/// Phase 3 will implement this; Phase 1 always returns `NotImplemented`.
pub fn record_disclosure_request(
    _env: &Env,
    _caller: Address,
    _key: DisclosureKey,
) -> Result<(), ShieldError> {
    Err(ShieldError::NotImplemented)
}

/// Verifies a disclosure: given a `DisclosureKey`, returns the real
/// transfer amount and parties if the key is valid for a recorded
/// transfer.
///
/// Phase 3 will implement this; Phase 1 always returns `NotImplemented`.
pub fn verify_disclosure(_env: &Env, _key: DisclosureKey) -> Result<(), ShieldError> {
    Err(ShieldError::NotImplemented)
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{BytesN, Env};

    #[test]
    fn record_disclosure_request_is_not_implemented_in_phase_1() {
        let env = Env::default();
        let caller = Address::generate(&env);
        let key = DisclosureKey {
            transfer_id: BytesN::from_array(&env, &[0u8; 32]),
            viewing_key: BytesN::from_array(&env, &[0u8; 32]),
        };
        let result = record_disclosure_request(&env, caller, key);
        assert_eq!(result, Err(ShieldError::NotImplemented));
    }

    #[test]
    fn verify_disclosure_is_not_implemented_in_phase_1() {
        let env = Env::default();
        let key = DisclosureKey {
            transfer_id: BytesN::from_array(&env, &[0u8; 32]),
            viewing_key: BytesN::from_array(&env, &[0u8; 32]),
        };
        let result = verify_disclosure(&env, key);
        assert_eq!(result, Err(ShieldError::NotImplemented));
    }
}
