# Contract Interface Reference

Public entrypoints of `ShieldContract` (`contracts/shield/src/lib.rs`).
This is the contract's external API surface — the intended final shape of
the product. See `README.md` and `docs/threat-model.md` for which parts are
mocked/stubbed in the current phase.

## `initialize`

```rust
fn initialize(env: Env, asset_contract: Address) -> Result<(), ShieldError>
```

One-time setup. Records the Stellar Asset Contract address this pool
shields deposits/withdrawals for. Errors with `AlreadyInitialized` if
called more than once.

## `deposit`

```rust
fn deposit(env: Env, depositor: Address, amount: i128) -> Result<ShieldedAccount, ShieldError>
```

Deposits `amount` into `depositor`'s shielded balance. Requires
`depositor`'s authorization. `amount` must be positive.

**Errors:** `NotInitialized`, `InsufficientBalance` (used for invalid amount
in Phase 1; will not be the error type used for this case after Phase 2's
zero/negative-amount validation is folded into proof verification).

## `withdraw`

```rust
fn withdraw(env: Env, owner: Address, amount: i128) -> Result<ShieldedAccount, ShieldError>
```

Withdraws `amount` from `owner`'s shielded balance. Requires `owner`'s
authorization. Fails if `amount` exceeds the current balance.

**Errors:** `NotInitialized`, `AccountNotFound`, `InsufficientBalance`.

## `balance`

```rust
fn balance(env: Env, owner: Address) -> Option<ShieldedAccount>
```

Returns the shielded account record for `owner`, or `None` if no account
exists yet. **Phase 1 caveat:** this returns the real balance in cleartext —
see `docs/threat-model.md`. Post-Phase-2, this will return a commitment that
only the account owner can open.

## `confidential_transfer`

```rust
fn confidential_transfer(
    env: Env,
    from: Address,
    to: Address,
    proof: ProofKind,
) -> Result<BytesN<32>, ShieldError>
```

Transfers a confidential amount from `from` to `to`, authorized by `proof`.
Requires `from`'s authorization. Emits a `transfer` event containing only
`from`, `to`, and the returned opaque `transfer_id` — never the amount.

The `transfer_id` is `SHA-256(xdr(from) || xdr(to) || nonce || amount)`: a
deterministic, binding commitment over the parties, proof nonce, and amount.
A party to the transfer can later use it to register a disclosure key (see
`record_disclosure_request`). It is *binding*, not *hiding* — see
`docs/threat-model.md` for the Phase 1/2 caveat that the amount still travels
in cleartext inside the mock proof.

**Phase 1:** `proof` must be `ProofKind::Mock(MockProof { amount, nonce })`.
See `docs/threat-model.md` for why this provides no real privacy yet.

**Errors:** `NotInitialized`, `InvalidProof`, `AccountNotFound`,
`InsufficientBalance`.

## `record_disclosure_request`

```rust
fn record_disclosure_request(env: Env, caller: Address, key: DisclosureKey) -> Result<(), ShieldError>
```

Registers a disclosure for the transfer identified by `key.transfer_id` so
`key.viewing_key` can later be shared out-of-band (auditor, regulator,
counterparty) for verification. Requires `caller` to be **a party to the
transfer** (`record.from` or `record.to`).

Only `SHA-256(viewing_key)` is stored, never the key itself. Re-recording for
the same transfer rotates the key: the previous viewing key stops working.

**Errors:** `TransferNotFound`, `Unauthorized`.

## `verify_disclosure`

```rust
fn verify_disclosure(env: Env, key: DisclosureKey) -> Result<DisclosureRecord, ShieldError>
```

Verifies a disclosure. If a disclosure was recorded for `key.transfer_id` and
`key.viewing_key` matches, returns the `DisclosureRecord` — the transfer's
real amount and parties. The key is bound to the `transfer_id`, so the holder
sees **only** that transfer and cannot read any other transfer in the pool.

**Errors:** `DisclosureNotFound`, `InvalidDisclosureKey`.

## Types

See `contracts/shield/src/types.rs` for `ShieldedAccount`, `ProofKind`,
`MockProof`, `DisclosureKey`, `DisclosureRecord`, `TransferRecord`, and
`DataKey`.

## Errors

See `contracts/shield/src/errors.rs` for the full `ShieldError` enum.
