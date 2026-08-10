//! Contract error types.

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ShieldError {
    /// The account does not have enough shielded balance to cover the
    /// requested operation.
    InsufficientBalance = 1,
    /// The supplied proof failed verification (or, in Phase 1, failed the
    /// mock well-formedness check).
    InvalidProof = 2,
    /// No shielded account exists for the given address.
    AccountNotFound = 3,
    /// The caller is not authorized to perform this action.
    Unauthorized = 5,
    /// The contract has already been initialized.
    AlreadyInitialized = 6,
    /// The contract has not been initialized yet.
    NotInitialized = 7,
    /// No transfer record exists for the given `transfer_id`.
    TransferNotFound = 8,
    /// No disclosure record exists for the given `transfer_id`.
    DisclosureNotFound = 9,
    /// The disclosure key's viewing key does not match the recorded one.
    InvalidDisclosureKey = 10,
}

impl core::fmt::Display for ShieldError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        let msg = match self {
            ShieldError::InsufficientBalance => {
                "insufficient shielded balance to cover the requested operation"
            }
            ShieldError::InvalidProof => "proof failed verification",
            ShieldError::AccountNotFound => "no shielded account exists for the given address",
            ShieldError::Unauthorized => "caller is not authorized to perform this action",
            ShieldError::AlreadyInitialized => "contract has already been initialized",
            ShieldError::NotInitialized => "contract has not been initialized yet",
            ShieldError::TransferNotFound => "no transfer record exists for the given transfer_id",
            ShieldError::DisclosureNotFound => {
                "no disclosure record exists for the given transfer_id"
            }
            ShieldError::InvalidDisclosureKey => {
                "the viewing key does not match the recorded disclosure key"
            }
        };
        f.write_str(msg)
    }
}

#[cfg(test)]
mod tests {
    extern crate alloc;
    use super::*;
    use alloc::string::ToString;

    #[test]
    fn display_insufficient_balance() {
        assert_eq!(
            ShieldError::InsufficientBalance.to_string(),
            "insufficient shielded balance to cover the requested operation"
        );
    }

    #[test]
    fn display_invalid_proof() {
        assert_eq!(
            ShieldError::InvalidProof.to_string(),
            "proof failed verification"
        );
    }

    #[test]
    fn display_account_not_found() {
        assert_eq!(
            ShieldError::AccountNotFound.to_string(),
            "no shielded account exists for the given address"
        );
    }

    #[test]
    fn display_unauthorized() {
        assert_eq!(
            ShieldError::Unauthorized.to_string(),
            "caller is not authorized to perform this action"
        );
    }

    #[test]
    fn display_already_initialized() {
        assert_eq!(
            ShieldError::AlreadyInitialized.to_string(),
            "contract has already been initialized"
        );
    }

    #[test]
    fn display_not_initialized() {
        assert_eq!(
            ShieldError::NotInitialized.to_string(),
            "contract has not been initialized yet"
        );
    }

    #[test]
    fn display_transfer_not_found() {
        assert_eq!(
            ShieldError::TransferNotFound.to_string(),
            "no transfer record exists for the given transfer_id"
        );
    }

    #[test]
    fn display_disclosure_not_found() {
        assert_eq!(
            ShieldError::DisclosureNotFound.to_string(),
            "no disclosure record exists for the given transfer_id"
        );
    }

    #[test]
    fn display_invalid_disclosure_key() {
        assert_eq!(
            ShieldError::InvalidDisclosureKey.to_string(),
            "the viewing key does not match the recorded disclosure key"
        );
    }

    #[test]
    fn display_matches_every_variant() {
        let variants = [
            ShieldError::InsufficientBalance,
            ShieldError::InvalidProof,
            ShieldError::AccountNotFound,
            ShieldError::Unauthorized,
            ShieldError::AlreadyInitialized,
            ShieldError::NotInitialized,
            ShieldError::TransferNotFound,
            ShieldError::DisclosureNotFound,
            ShieldError::InvalidDisclosureKey,
        ];
        for variant in variants {
            let rendered = variant.to_string();
            assert!(!rendered.is_empty(), "variant rendered empty message");
            assert!(!rendered.contains("ShieldError"));
        }
    }
}
