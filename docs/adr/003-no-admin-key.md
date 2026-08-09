# 003: No admin key or pause mechanism

**Status:** Accepted
**Date:** 2026-07-31

## Context

Many token contracts include an admin/owner key with privileged powers
(e.g. minting, freezing balances, pausing all operations) and a pause
mechanism to halt trading during incidents. This contract handles
confidential balances where funds are attributed to individual users via
`owner` fields and authenticated with `Address::require_auth`.

An admin key would be a single point of compromise: anyone holding it could
freeze or misappropriate shielded funds without a per-user proof, directly
undermining the privacy guarantees this project exists to provide. A pause
flag in contract storage would also require trusted off-chain parties or a
governance mechanism that does not exist yet.

## Decision

The contract has **no** admin, owner, mint, freeze, or pause mechanism.
Every mutating operation (`deposit`, `withdraw`, `confidential_transfer`)
is authorized per-address via `Address::require_auth`; there is no
privileged actor and no global on/off switch in contract storage.

## Consequences

- **Easier:** no privilege-escalation surface, no governance/key-management
  burden, simpler audit story — the contract's authority model is exactly
  the users' own signatures.
- **Harder:** incidents cannot be paused or clawed back; a bug (e.g. in the
  Phase 1 mock proof) is not survivable via an emergency stop and must be
  fixed by redeploying.
- **Trade-off accepted:** redeploy-and-migrate is preferred over carrying an
  admin key, matching the project's privacy-first stance. Revisit this
  decision via a new ADR if Phase 2+ introduces a need for recoverability.
