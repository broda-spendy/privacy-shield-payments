# Disclosure Key Derivation Scheme

**Status:** Proposed (design for Phase 3)
**Supersedes/extends:** [ADR-004](adr/004-disclosure-key-design.md)

## 1. Goal

Selective disclosure lets a party to a confidential transfer prove that
transfer's real **amount, sender, and receiver** to a third party (auditor,
regulator, counterparty reconciliation) — while revealing **nothing else**:
no other transfer's data, no account balances, no nonces, and no master
secrets.

This document specifies the key derivation scheme, exactly what a disclosed
key reveals, how a verifier uses it in isolation, and the on-chain storage
schema. It is the design companion to the Phase 3 implementation in
`contracts/shield/src/disclosure.rs` (`record_disclosure_request` /
`verify_disclosure`) and to `DataKey::Disclosure(BytesN<32>)`.

## 2. Components and notation

| Symbol | Meaning |
|---|---|
| `sender` | Party initiating the confidential transfer |
| `recipient` | Party receiving the transfer |
| `nonce` | 32-byte transfer nonce from the proof (`MockProof.nonce`) |
| `amount` | Transfer amount in base units |
| `transfer_id` | `SHA-256( xdr(sender) \|\| xdr(recipient) \|\| nonce \|\| amount_be )` — the binding commitment published in the transfer event (see ADR-004 and `transfer::transfer_id_for`, which uses big-endian amount bytes) |
| `vk` | Viewing key: the out-of-band secret shared with a verifier |
| `vk_hash` | `SHA-256(vk)` — the only key material stored on-chain |
| `master_vk` | A sender-side long-term secret used to derive per-transfer `vk`s |

## 3. Key derivation (BLAKE3 sub-keys)

A per-transfer viewing key is derived from a **sender-side master viewing
secret** and the **transfer nonce**, using BLAKE3's `derive_key` (KDF mode,
where the context string provides domain separation):

```
vk = BLAKE3.derive_key(
        context       = "privacy-shield-payments:disclosure:v1",  # domain separation
        key_material  = master_vk || transfer_id || nonce,        # per-transfer binding
     )
# output is 32 bytes (BLAKE3 default)
```

### 3.1 Why BLAKE3

- **KDF mode** is designed for exactly this: it expands a secret
  (`master_vk`) plus per-use data into independent outputs, so leaking one
  `vk` does not reveal `master_vk` or any other `vk`.
- **Fast, dependency-light, deterministic**: the same
  `(master_vk, transfer_id, nonce)` always yields the same `vk`, so a party
  can re-derive a key for a transfer months later without storing it.
- **Client-side only**: BLAKE3 derivation runs off-chain in the sender's
  wallet/SDK. The on-chain contract never sees `master_vk`; it only hashes
  the derived `vk` with SHA-256 (available in the Soroban host via
  `env.crypto().sha256`) and stores the hash. This keeps the Wasm contract
  small and avoids hosting a KDF on-chain.

### 3.2 Why bind to `transfer_id` and `nonce`

- `transfer_id` already commits to `(sender, recipient, nonce, amount)`, so
  `vk` is transitively bound to the exact transfer. Sharing `vk` for transfer
  *A* cannot produce a key for any other transfer because its `input` differs.
- Including `nonce` explicitly (it is inside `transfer_id`) is redundant but
  harmless and keeps the derivation self-describing; the effective binding is
  the `transfer_id` term.

### 3.3 Key rotation

Re-recording a disclosure for the same `transfer_id` with a freshly derived
`vk` overwrites `vk_hash`; the previous key stops working. This is the
existing `record_disclosure_request` behavior (see ADR-004 and the rotation
test in `disclosure.rs`).

## 4. What the key reveals (and what it hides)

A valid `(transfer_id, vk)` reveals **exactly**:

| Revealed | Source |
|---|---|
| Amount | `DisclosureRecord.amount` (written at registration) |
| Sender | `DisclosureRecord.from` |
| Recipient | `DisclosureRecord.to` |

A valid `(transfer_id, vk)` reveals **nothing else**:

| Hidden | Why |
|---|---|
| Any other transfer's amount/parties | `verify_disclosure` looks up strictly by `transfer_id`; a `vk` derived for a different `transfer_id` fails the `vk_hash` comparison |
| Account balances / pool state | Not included in `DisclosureRecord` |
| The nonce | Not returned by `verify_disclosure` |
| `master_vk` / any other `vk` | BLAKE3 KDF mode; each `vk` is independent |
| `vk` itself on-chain | Only `SHA-256(vk)` is stored |
| Merkle/pool secrets | None are used in this scheme |

Security property summary (explicit list for the acceptance criteria):

- **Correctness**: holder of a valid `vk` for `transfer_id` always recovers
  the true `amount`, `sender`, and `recipient`.
- **Isolation**: a valid key opens exactly one transfer; it cannot be used to
  probe or decrypt any other record.
- **Unforgeability**: without `master_vk` (or the sender's per-transfer `vk`),
  an adversary cannot construct a `vk` that passes `vk_hash` verification.
- **Non-repudiation of sharing**: only a party to the transfer can register a
  disclosure (see §6), so a shared key can only exist for real transfers.
- **Hiding caveat (Phase 3)**: `transfer_id` is a *binding* commitment, not a
  *hiding* one. An observer who already knows `(sender, recipient, nonce)`
  could brute-force a small `amount` from `transfer_id`. The disclosure key
  does not make this worse, but a production scheme must pair this with a
  real hiding commitment (tracked with the Phase 2 commitment work and
  documented in `docs/threat-model.md`).

## 5. How a verifier uses the key without learning anything else

1. The verifier receives `(transfer_id, vk)` out-of-band.
2. It calls `verify_disclosure(key)` with `DisclosureKey { transfer_id, viewing_key: vk }`.
3. The contract recomputes `SHA-256(vk)` and compares it to the stored
   `vk_hash` for exactly that `transfer_id`.
4. On match it returns `DisclosureRecord { transfer_id, from, to, amount }`.

Because the lookup is keyed strictly on `transfer_id` and the record stores
only the hash, the verifier gains no oracle into the pool: there is no
endpoint that returns records for arbitrary keys, and every probe is pinned
to the one identifier the verifier already possesses. The verifier learns
only the disclosed transfer's amount and parties.

## 6. Registration authority

`record_disclosure_request(caller, key)`:

1. Requires `caller.require_auth()`.
2. Loads `TransferRecord` by `key.transfer_id`; fails with
   `ShieldError::TransferNotFound` if absent.
3. Rejects `ShieldError::Unauthorized` unless `caller` is the transfer's
   `from` or `to`.
4. Stores `vk_hash = SHA-256(key.viewing_key)` under
   `DataKey::Disclosure(transfer_id)`.

The contract never sees `master_vk`; the sender derives `vk` client-side and
shares it directly with the verifier. The on-chain path only ever handles the
per-transfer `vk` (and only stores its hash).

## 7. Storage schema — `DataKey::Disclosure(BytesN<32>)`

```
DataKey::Disclosure(transfer_id: BytesN<32>)
        └─> DisclosureRecord {
                transfer_id:   BytesN<32>,   // == the storage key
                from:          Address,      // sender
                to:            Address,      // recipient
                amount:        i128,         // revealed amount
                viewing_key_hash: BytesN<32> // SHA-256(vk); never the raw vk
            }
```

- Key: the 32-byte `transfer_id` (the same commitment emitted in the
  `transfer` event).
- Value: `DisclosureRecord` (defined in `contracts/shield/src/types.rs`).
- `viewing_key_hash` is the **only** secret-bearing field, and it is a
  one-way hash. Instance storage therefore holds no recoverable key material.
- One record per transfer. Re-registration rotates the key by overwriting
  `viewing_key_hash` (no tombstones needed).

## 8. Derivation vs. current implementation

The on-chain contract as merged accepts an externally supplied `DisclosureKey`
(`transfer_id`, `viewing_key`) and stores `SHA-256(viewing_key)`. This
document specifies the **client-side derivation** of `viewing_key` from
`master_vk` per §3. The two compose: the sender derives `vk` with BLAKE3
`derive_key`, passes it through `record_disclosure_request`, and the
contract's hash-compare logic is unchanged.

## 9. Open questions / future work

- **Verifier revocation**: currently rotating the key is sender-driven; a
  verifier-revocation registry is out of scope for Phase 3.
- **Hiding commitment**: replace/augment `transfer_id` with a hiding
  commitment to close the brute-force caveat in §4 (Phase 2 commitment work).
- **Derivation in the SDK**: expose a `derive_disclosure_key(transfer_id,
  nonce)` helper in the client tooling so callers do not implement BLAKE3
  `derive_key` by hand.

## 10. References

- [ADR-004: transfer_id and viewing-key design](adr/004-disclosure-key-design.md)
- [`contracts/shield/src/disclosure.rs`](../contracts/shield/src/disclosure.rs)
- [`contracts/shield/src/types.rs`](../contracts/shield/src/types.rs)
- [`docs/threat-model.md`](threat-model.md)
