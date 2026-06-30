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
    /// This functionality is defined in the public interface but not yet
    /// implemented — used by Phase 3 disclosure stubs in Phase 1.
    NotImplemented = 4,
    /// The caller is not authorized to perform this action.
    Unauthorized = 5,
    /// The contract has already been initialized.
    AlreadyInitialized = 6,
    /// The contract has not been initialized yet.
    NotInitialized = 7,
}
