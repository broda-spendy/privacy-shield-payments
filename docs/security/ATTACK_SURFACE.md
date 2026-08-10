# Attack Surface Enumeration — Privacy-Shield Payments

**Status:** Draft for review (Phase 6)
**Scope:** `contracts/shield` as of Phase 1 scaffolding (mock proofs, plain
`i128` balances). Reviewed against the Phase 2–3 roadmap (Pedersen
commitments + range proofs, selective disclosure).

This document enumerates the known attack surfaces of the contract and its
deployment, so the Phase 6 external audit can focus on the right questions.
It is a **living document**: update it whenever a phase changes the
contract's behavior.

Every surface is scored for **likelihood** and **impact** and lists the
**current mitigation** and the **recommended audit focus**.

---

## 1. Re-entrancy

### Description

A contract calling an external contract (e.g. a Stellar Asset Contract
token transfer) can be re-entered from that callee before its own state
update completes.

### Current mitigations

- **Execution model:** Soroban contract calls are synchronous and the host
  enforces a hard call-stack depth limit; a failed invocation rolls back
  **all** state changes in the enclosing transaction. There is no
  "uncommitted intermediate state" an attacker can permanently corrupt.
- **Phase 1 code:** `pool::deposit` and `pool::withdraw`
  (`contracts/shield/src/pool.rs`) perform `require_auth` → arithmetic →
  storage write with **no external contract call in between**, so there is
  no callback surface today.
- **Phase 2+:** when the Stellar Asset Contract transfer is wired into
  deposit/withdraw (issue #15), balance bookkeeping must be updated
  **before** the external call (checks-effects-interactions). Because
  Soroban rolls back on failure, the main residual risk is *logic* re-entry
  (e.g. reading a not-yet-updated balance) rather than permanent state
  corruption.

### Likelihood / Impact

| Likelihood | Impact |
|---|---|
| Low today (no external calls); Medium once SAC integration lands | High if a double-withdraw bug is reachable |

### Recommended audit focus

- Confirm checks-effects-interactions ordering in the Phase 2 deposit/
  withdraw flow.
- Confirm balance reads in re-entrant frames see the post-update state.
- Confirm host call-depth and rollback behavior is not relied upon as the
  *only* defense.

---

## 2. Front-running / ordering (MEV)

### Description

The public mempool exposes that a `confidential_transfer` between two
addresses is about to happen. Sender and recipient are explicit call
arguments and appear in the emitted `transfer` event; the **amount is not**
published in the event.

### Current mitigations

- The `transfer` event carries only `from`, `to`, and an opaque
  `transfer_id` — never the amount (`docs/interface.md`).
- `transfer_id = SHA-256(xdr(from) || xdr(to) || nonce || amount)` is a
  **binding** commitment: for high-entropy nonces and non-trivial amounts it
  cannot be inverted in practice.
- Authorization is per-address (`require_auth` on the `from` side), so an
  attacker cannot redirect a transfer — they can only reorder it.
- **Phase 1 caveat:** `ProofKind::Mock` carries the amount in **cleartext**
  inside the call, so a mempool observer can decode the amount today. This
  is removed in Phase 2 when the proof becomes a range proof.

### Likelihood / Impact

| Likelihood | Impact |
|---|---|
| Medium (public mempool) | Low–Medium: ordering races, small-amount brute-force of `transfer_id`; no fund theft |

### Recommended audit focus

- Confirm the amount never serializes into events or ledger entries in
  Phase 2.
- Assess MEV once SAC transfers land (front-running a deposit→withdraw
  sequence to influence fees/ordering).
- Consider whether `nonce` entropy is sufficient to resist offline
  brute-force of small amounts.

---

## 3. Disclosure key leakage

### Description

A party to a transfer records a disclosure key; the contract stores only
`SHA-256(viewing_key)` under `DataKey::Disclosure(transfer_id)`. A holder
of the correct key calls `verify_disclosure` and learns that **one**
transfer's amount and parties.

### Current mitigations

- The raw viewing key is **never** stored — only its SHA-256 hash
  (`types.rs`, `docs/interface.md`).
- Keys are scoped to a single `transfer_id`; a stolen key reveals **only
  that transfer**, not any other pool transaction.
- The binding is a hash commitment, **not** a hiding commitment: a
  low-entropy viewing key (or a brute-forceable amount space) can be
  attacked offline. Clients must generate 32-byte random keys
  (`examples/` use `randomBytes(32)`).
- Key rotation: re-recording for the same `transfer_id` invalidates the
  previous key.

### Likelihood / Impact

| Likelihood | Impact |
|---|---|
| Low–Medium (depends on key hygiene out-of-band) | Medium: one transfer's confidentiality breached |

### Recommended audit focus

- Confirm a key for transfer A cannot read transfer B (scope binding).
- Confirm rotation actually invalidates the old hash.
- Confirm `verify_disclosure` reveals nothing when no record exists
  (timing/error side channels).

---

## 4. Admin key compromise

### Description

Many contracts carry a privileged admin/owner key that can mint, freeze, or
pause. This contract deliberately has **none** (`docs/adr/003-no-admin-key.md`).

### Current mitigations

- No admin, owner, mint, freeze, or pause mechanism exists in contract
  storage. Every mutation is authorized per-address via `require_auth`.
- A compromised deployer key grants **no** post-deployment powers.
- **Residual surface — unauthenticated `initialize`:** `initialize`
  (`lib.rs`) has **no `require_auth`**; the first caller to invoke it wins.
  A front-runner could initialize first with an attacker-chosen
  `asset_contract` address. Impact is limited to the recorded address value
  (Phase 1 does not yet move real tokens), but this becomes material once
  SAC transfers are wired in Phase 2.

### Likelihood / Impact

| Likelihood | Impact |
|---|---|
| N/A for admin compromise (no admin); Low–Medium for `initialize` race | High if an attacker-controlled SAC address is recorded before real funds move |

### Recommended audit focus

- Confirm `initialize` is executed **atomically with deploy** (same
  transaction) or otherwise secured against front-running.
- Confirm no privileged key exists anywhere in the contract surface.

---

## 5. Proof forgery

### Description

`proof::verify` in Phase 1 performs **no cryptography**: a mock proof
verifies if and only if its amount is positive (`proof.rs`,
`MockProof::is_well_formed`).

### Current mitigations

- The mock is explicitly gated behind `unsafe_for_production_*` naming and
  module/README warnings. The contract **must not** be deployed beyond
  testnet until Phase 2 replaces it.
- The proof interface (`proof::verify`) is designed as a drop-in boundary
  for the Phase 2 range-proof verifier, so the swap is mechanical.
- Phase 2 plan: Pedersen commitments for balances plus Bulletproofs-style
  range proofs bind the transferred amount to the sender's commitment.

### Likelihood / Impact

| Likelihood | Impact |
|---|---|
| **High today** (trivially forgeable by any caller authorized for an account) | **Critical** if deployed to mainnet before Phase 2 |

### Recommended audit focus

- Verify the Phase 2 verifier binds the proof to public inputs (sender's
  balance commitment, amount range, recipient commitment) and rejects
  malformed/shortened proofs.
- Verify the verifier has no soundness shortcuts and no panic/DoS paths on
  hostile inputs (ties to issue #16, fuzzing).

---

## 6. Integer overflow / arithmetic

### Description

All balance arithmetic must be overflow-safe; a bug here could mint or
destroy shielded balances.

### Current mitigations

- `pool::deposit` uses `checked_add` and returns
  `InsufficientBalance` on overflow (`pool.rs`).
- `pool::withdraw` rejects `amount <= 0`, requires an existing account, and
  rejects `amount > balance` before subtracting — balances can never go
  negative and the subtraction cannot underflow.
- Workspace release profile sets `overflow-checks = true` in
  `Cargo.toml`.
- Property-based tests cover deposit accumulation, withdraw-roundtrip,
  overdraw, and non-positive amounts (`pool.rs` proptests, issue #10).

### Likelihood / Impact

| Likelihood | Impact |
|---|---|
| Low today | Low–Medium (arithmetic bug could mint/destroy balances) |

### Recommended audit focus

- Confirm checked arithmetic on **every** money path, including Phase 2
  commitment arithmetic (scalar math modulo the curve order is a new,
  distinct surface).
- Extend fuzz coverage to deposit/withdraw edge amounts (issue #16).

---

## Summary table

| # | Surface | Likelihood | Impact | Main mitigation | Phase |
|---|---------|-----------|--------|-----------------|-------|
| 1 | Re-entrancy | Low → Medium (P2) | High | No external calls today; checks-effects-interactions in P2 | P1/P2 |
| 2 | Front-running | Medium | Low–Med | Amount hidden from events; per-address auth | P2 |
| 3 | Disclosure key leak | Low–Med | Medium | Hash-only storage; single-transfer scoping | P3 |
| 4 | Admin key compromise | N/A (no admin); init race Low–Med | High | No privileged key; atomic deploy+init | P1 |
| 5 | Proof forgery | **High (P1)** | **Critical** | Mock gated; real proofs in P2 | P2 |
| 6 | Integer overflow | Low | Low–Med | `checked_add`; guards; `overflow-checks` | P1 |

## Related documents

- `docs/threat-model.md` — privacy posture and Phase 1 caveats
- `docs/interface.md` — public contract interface
- `docs/adr/003-no-admin-key.md` — the no-admin-key decision
- `README.md` — project status
