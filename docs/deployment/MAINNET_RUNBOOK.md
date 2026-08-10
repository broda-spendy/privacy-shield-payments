# Mainnet Deployment Runbook — Privacy-Shield Payments

**Status:** Draft for review (Phase 6)
**Prerequisite phases:** Phase 2 (real proofs) and Phase 5 (testnet
deployment, integration tests, gas/resource pass) **must** be complete and
an **external audit** must have passed before anything here is executed.

> ⚠️ **Phase 1 MUST NOT be deployed to mainnet.** The contract's proof
> verification is mocked (`contracts/shield/src/proof.rs`). Deploying the
> Phase 1 contract to mainnet would let anyone with authorization over an
> account forge transfers. See `docs/threat-model.md` and
> `docs/security/ATTACK_SURFACE.md` §5.

This runbook complements the testnet runbook referenced in `PRD.md`
Phase 5. It assumes the deployer is familiar with `soroban`/`stellar`
contract tooling and the contract interface in `docs/interface.md`.

---

## 1. Pre-deployment checklist

Gate every item below before any mainnet transaction:

- [ ] **Audit complete.** External security audit of the deployed WASM
      (hash matches, see §2) closed without outstanding critical/high
      findings.
- [ ] **Contract ID approved.** The target contract ID is recorded in this
      runbook and approved by the responsible parties (see §5).
- [ ] **WASM artifact frozen.** Build is reproducible; the release WASM hash
      is recorded below and matches the audited artifact.
- [ ] **Asset contract confirmed.** The `asset_contract` address passed to
      `initialize` is the real Stellar Asset Contract for the intended
      asset (not a testnet or impostor address). Verify the SAC address and
      its issuer/trustline before initializing.
- [ ] **Key management.** Deployer keys are in cold storage / a hardware
      wallet, multi-signer reviewed. Secrets are not in CI, `.env`, or the
      repo.
- [ ] **Initialization authority decided.** `initialize` is unauthenticated
      (first caller wins) — deploy + initialize **atomically in one
      transaction** or otherwise prevent a front-runner from recording an
      attacker-chosen asset contract (see `ATTACK_SURFACE.md` §4).
- [ ] **Operational contacts on call** (see §5).
- [ ] **Monitoring configured** (see §6) with alerting thresholds.

**Recorded values (fill in at execution time):**

| Item | Value |
|------|-------|
| Release WASM path | `target/wasm32-unknown-unknown/release/shield_contract.wasm` |
| Release WASM SHA-256 | |
| Deployed contract ID | |
| Asset contract (SAC) address | |
| Network passphrase | `Public Global Stellar Network ; September 2015` |
| RPC endpoint | |

---

## 2. Deployment procedure

### 2.1 Build the release WASM

```bash
cargo build --workspace --target wasm32-unknown-unknown --release
```

### 2.2 Verify the WASM hash

Soroban's `wasm_hash` is the SHA-256 of the uploaded WASM, so it must match
your local artifact:

```bash
sha256sum target/wasm32-unknown-unknown/release/shield_contract.wasm
```

Record the output above. Compare it to the hash of the **audited** artifact
and to the hash returned by `contract install` below. Any mismatch = abort.

### 2.3 Install and deploy

```bash
# Install the WASM (returns/registers the wasm_hash).
soroban contract install \
  --wasm target/wasm32-unknown-unknown/release/shield_contract.wasm \
  --network mainnet \
  --source <DEPLOYER_KEYPAIR>

# Deploy from the installed hash.
soroban contract deploy \
  --wasm-hash <WASM_HASH> \
  --network mainnet \
  --source <DEPLOYER_KEYPAIR>
```

Record the returned **contract ID** (C-address) in §1. Treat the deploy
transaction hash as immutable proof of the artifact; keep it on file.

> Newer tooling ships the command as `stellar contract install` /
> `stellar contract deploy` — the flags are equivalent.

### 2.4 Initialize (atomic with deploy if possible)

`initialize` records the asset contract address and can be called only once.
Because it is unauthenticated, deploy and initialize should be performed in
a **single transaction** (or back-to-back with a pre-signed, ordered pair)
so no other account can front-run it.

```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --network mainnet \
  --source <DEPLOYER_KEYPAIR> \
  -- \
  initialize \
  --asset_contract <ASSET_SAC_ADDRESS>
```

Verify the call succeeded (returns `Ok(())`). Re-invoking must fail with
`AlreadyInitialized`.

---

## 3. Post-deployment verification

Run a **smoke test with small amounts** on mainnet before any real usage:

1. **Balance is clean:** `balance(<new account>)` returns `None` (or the
   seeded baseline).
2. **Deposit:** deposit a small amount with a funded, authorized account
   (`examples/deposit.ts` with `CONTRACT_ID` and RPC pointed at mainnet).
   Confirm the returned `ShieldedAccount.balance` matches.
3. **Transfer:** run a confidential transfer of a small amount
   (`examples/transfer.ts`). Confirm the `transfer_id` matches the expected
   `SHA-256(xdr(from) || xdr(to) || nonce || amount)` and that the **event
   contains no amount**.
4. **Withdraw:** withdraw the transferred amount and confirm the balances
   settle to zero.
5. **Disclosure:** (Phase 3+) record a disclosure and verify it with the
   correct and a wrong key (`examples/disclosure.ts`).
6. Confirm monitoring (indexer, RPC health) reports the smoke-test
   transactions with no gaps.

Sign off in the deployment log with the transaction hashes.

---

## 4. Rollback procedure

### 4.1 Rollback limitations — READ FIRST

- **Soroban contracts are immutable.** Once deployed, the WASM cannot be
  edited or deleted, and **this contract has no upgrade proxy**.
- **There is no admin, freeze, or pause mechanism** (see
  `docs/adr/003-no-admin-key.md`). Neither the team nor any keyholder can
  halt the contract or claw back funds.
- If the deployed contract is vulnerable, the team **cannot recover funds**
  already moved into it — users must individually withdraw.

### 4.2 If a defect is found

1. **Do not migrate new value in.** Pause the frontend's deposit path (see
   §5.2). Any user who has not deposited is unaffected.
2. **Assess exposure.** Can existing users withdraw safely? If yes,
   instruct them to withdraw before anything else.
3. **Do not patch in place** — there is no upgrade path. Build a corrected
   contract, redeploy it (§2), and publish the new contract ID.
4. **Coordinate migration.** Because the contract cannot move funds itself,
   users must manually withdraw from the old contract and deposit into the
   new one. The team should publish a verified migration checklist and,
   where practical, signed verification tooling.
5. **Record the incident** per §5.4 and update the threat model and this
   runbook.

### 4.3 Pre-deployment risk reduction

The only true "rollback" for this architecture is **not deploying a
defective artifact**: an audited, hash-pinned WASM deployed once, atomic
deploy+initialize, and a go/no-go gate in §1.

---

## 5. Incident response

### 5.1 Roles / contacts

| Role | Responsibility | Contact |
|------|----------------|---------|
| Contract maintainers | Confirm/refute the report, coordinate fixes | (repository maintainers / GitHub Security advisories) |
| Deployer / keyholder | Sign any necessary transactions | (cold-storage keyholder) |
| Frontend / indexer operator | Pause UI surfaces, update alerts | (ops contact) |
| External auditor | Independent confirmation of a claimed vulnerability | (audit firm) |

### 5.2 Immediate actions

1. **Pause the frontend.** Disable deposit/transfer entrypoints in the UI.
   The contract itself has no pause — this is a UI/ops-only control.
2. **Stop the indexer writes** if they are writing untrusted state.
3. **Preserve evidence:** transaction hashes, logs, and the reported
   reproduction steps.
4. **Triage** against `docs/security/ATTACK_SURFACE.md`; classify severity.
5. If a vulnerability is confirmed: follow §4.2, and do **not** rely on any
   in-place fix.

### 5.3 Communication

- Prefer GitHub **Security advisories** (private disclosure) for
  vulnerabilities, then a coordinated public advisory after a fix/deploy.
- Announce operational incidents (e.g. RPC outage) on the project's
  supported channels within the SLA the team commits to in §1.

### 5.4 Post-incident

- Blameless review; update this runbook, `docs/threat-model.md`, and
  `docs/security/ATTACK_SURFACE.md` with findings.
- Track remediation as new issues.

---

## 6. Monitoring setup

- **Soroban RPC health.** Alert when the mainnet RPC endpoint
  (`soroban-rpc` mainnet URL) errors or times out above a threshold (e.g.
  >1% of requests over 5 min).
- **Indexer health.** The frontend indexer that follows contract events
  must alert on ledger gaps/stalls (issue #33). Track the last processed
  ledger against the network's latest ledger.
- **Contract events.** Watch for `transfer` events and for error spikes
  (`InsufficientBalance`, `InvalidProof`, `AccountNotFound`) that may
  indicate misuse or an attack.
- **Initialization status.** A **second** `initialize` must never be
  possible; alert on any storage change to the asset-contract key.
- **Balance anomalies.** Detect abrupt changes in aggregate shielded
  balance (early warning of a protocol-level bug).
- **Node/validator basics.** Alert on missed slots, sync issues, and fee
  spikes on the operations account.

Set alert severity tiers (page vs. ticket) in the ops runbook and test the
alerts with the §3 smoke test.

---

## Related documents

- `docs/interface.md` — contract interface (initialize/deposit/withdraw/transfer/disclosure)
- `docs/security/ATTACK_SURFACE.md` — attack surfaces and audit focus
- `docs/threat-model.md` — privacy posture and Phase 1 caveats
- `docs/adr/003-no-admin-key.md` — no-admin/no-pause decision
- `docs/SDK_USAGE.md` and `examples/` — how to invoke the contract
- `PRD.md` — phased roadmap (Phase 5 testnet runbook reference)
