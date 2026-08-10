# 004: Selective disclosure — transfer_id and viewing-key design

**Status:** Accepted
**Date:** 2026-08-09

## Context

Phase 3 lets a party to a confidential transfer prove the transfer's real
amount and parties to a third party (auditor, regulator, counterparty
reconciliation) without exposing any other transfer. The contract cannot
just return the amount on demand — that would defeat confidentiality. The
design needs:

1. an opaque, addressable identifier per transfer that can be published in
   the transfer event without leaking the amount, and
2. a key that a party can register and later share out-of-band, where only a
   holder of the correct key can open the matching record.

## Decision

### `transfer_id` — a binding hash commitment

`confidential_transfer` computes:

```
transfer_id = SHA-256( xdr(from) || xdr(to) || nonce || amount_le )
```

- It is **deterministic** given the same inputs, so both parties can derive
  and recognize it (it is also returned by the endpoint and emitted in the
  event data).
- It **binds** the parties, the proof nonce, and the amount, and is unique
  with overwhelming probability across distinct nonces.
- The event publishes only `(from, to, transfer_id)` — never the amount.

The `TransferRecord` (amount + parties) is stored in instance storage under
`DataKey::Transfer(transfer_id)` so a party can later register a disclosure.

### Disclosure registration

`record_disclosure_request(caller, key)`:

- requires `caller` to be `record.from` or `record.to` (auth via
  `require_auth`, then a party check),
- stores a `DisclosureRecord` under `DataKey::Disclosure(transfer_id)`
  containing the amount, parties, and `SHA-256(viewing_key)` — **never the
  viewing key itself**.

Re-recording for the same transfer rotates the key (the old key stops
working). This is idempotent and needs no extra state.

### Verification

`verify_disclosure(key)` recomputes `SHA-256(key.viewing_key)`, compares it
to the stored hash, and returns the `DisclosureRecord` on match. Because the
record is keyed strictly on `transfer_id` and the viewing key is bound to
that record's hash, a valid key opens exactly one transfer.

## Consequences

- **Easier:** no shared-secret escrow, no Merkle tree, no asymmetric
  re-encryption — a hash commitment plus party-gated registration is
  sufficient for the Phase 3 goal.
- **Harder / caveat:** `transfer_id` is a *binding* commitment, not a
  *hiding* commitment. An observer who knows `from`, `to`, and `nonce`
  (e.g. from the mock proof's cleartext) could brute-force a small `amount`
  from the hash. The disclosure record does not make this worse — Phase 1/2
  already expose the amount in the mock proof. A real hiding commitment is
  planned together with the Phase 2 commitment work and should supersede
  this ADR (see `docs/threat-model.md`).
- **Trade-off accepted:** a transfer party can always choose *not* to record
  a disclosure, in which case no third party can verify — disclosure is
  strictly opt-in.
