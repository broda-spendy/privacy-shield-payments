# 📋 Contributor Issues Catalog — Privacy-Shield Payments

All contributor tasks are tracked as GitHub Issues on [broda-spendy/privacy-shield-payments/issues](https://github.com/broda-spendy/privacy-shield-payments/issues).

> **Target Branch**: All contributions and Pull Requests MUST target the [`main`](https://github.com/broda-spendy/privacy-shield-payments/tree/main) branch.

Below is the complete 30-issue contributor roadmap across all project phases.

---

## 🎯 Issue Index & File References (`main` branch)

### 1. Smart Contract & Cryptography (Soroban & Rust)
- **[#13](https://github.com/broda-spendy/privacy-shield-payments/issues/13)** `[Phase 2]` Implement Pedersen Commitment Type for Shielded Balances (Advanced)
  - Target Files: [`contracts/shield/src/types.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/types.rs), [`contracts/shield/src/pool.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/pool.rs)
- **[#14](https://github.com/broda-spendy/privacy-shield-payments/issues/14)** `[Phase 2]` Implement Range Proof Generation & Verification for Transfer Amounts (Advanced)
  - Target Files: [`contracts/shield/src/proof.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/proof.rs), [`contracts/shield/src/transfer.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/transfer.rs)
- **[#15](https://github.com/broda-spendy/privacy-shield-payments/issues/15)** `[Phase 2]` Wire Stellar Asset Contract (SAC) Token Transfer into Deposit/Withdraw (Intermediate)
  - Target Files: [`contracts/shield/src/pool.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/pool.rs)
- **[#16](https://github.com/broda-spendy/privacy-shield-payments/issues/16)** `[Phase 2]` Add Fuzz Tests for Proof Verification Logic (Advanced)
  - Target Files: [`contracts/shield/src/proof.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/proof.rs)
- **[#29](https://github.com/broda-spendy/privacy-shield-payments/issues/29)** `[Phase 5]` Gas & CPU Resource Optimization Pass on Contract (Advanced)
  - Target Files: [`contracts/shield/src/lib.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/lib.rs)

### 2. Selective Disclosure & Compliance Engine
- **[#17](https://github.com/broda-spendy/privacy-shield-payments/issues/17)** `[Phase 3]` Design Disclosure Key Derivation Scheme (Advanced)
  - Target Files: [`contracts/shield/src/disclosure.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/disclosure.rs)
- **[#18](https://github.com/broda-spendy/privacy-shield-payments/issues/18)** `[Phase 3]` Implement `record_disclosure_request` in `disclosure.rs` (Intermediate)
  - Target Files: [`contracts/shield/src/disclosure.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/disclosure.rs)
- **[#19](https://github.com/broda-spendy/privacy-shield-payments/issues/19)** `[Phase 3]` Implement `verify_disclosure` for Auditor Verification (Intermediate)
  - Target Files: [`contracts/shield/src/disclosure.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/disclosure.rs)
- **[#20](https://github.com/broda-spendy/privacy-shield-payments/issues/20)** `[Phase 3]` CLI Tool for Generating and Verifying Disclosure Proofs (Intermediate)
  - Target Directory: `tools/disclosure-cli/`

### 3. Frontend & Web UI (React, TypeScript, Freighter)
- **[#21](https://github.com/broda-spendy/privacy-shield-payments/issues/21)** `[Phase 4]` Set Up React + Vite Frontend Scaffold (Beginner)
  - Target Directory: `frontend/`
- **[#22](https://github.com/broda-spendy/privacy-shield-payments/issues/22)** `[Phase 4]` Build Freighter Wallet Connect/Disconnect Component (Beginner)
  - Target Directory: `frontend/src/components/`
- **[#23](https://github.com/broda-spendy/privacy-shield-payments/issues/23)** `[Phase 4]` Build Deposit UI (Shield Tokens into Pool) (Intermediate)
  - Target Directory: `frontend/src/components/`
- **[#24](https://github.com/broda-spendy/privacy-shield-payments/issues/24)** `[Phase 4]` Build Confidential Transfer UI Form (Intermediate)
  - Target Directory: `frontend/src/components/`
- **[#25](https://github.com/broda-spendy/privacy-shield-payments/issues/25)** `[Phase 4]` Build Shielded Balance View Component (Intermediate)
  - Target Directory: `frontend/src/components/`
- **[#26](https://github.com/broda-spendy/privacy-shield-payments/issues/26)** `[Phase 4]` Add Disclosure UI: Generate & Share Audit Bundle (Intermediate)
  - Target Directory: `frontend/src/components/`

### 4. SDK & Developer Experience (DX)
- **[#34](https://github.com/broda-spendy/privacy-shield-payments/issues/34)** `[DX]` Add ADR Process and Initial ADRs for Major Decisions (Beginner)
  - Target Directory: [`docs/adr/`](https://github.com/broda-spendy/privacy-shield-payments/tree/main/docs)
- **[#35](https://github.com/broda-spendy/privacy-shield-payments/issues/35)** `[DX]` Add rustfmt and clippy CI Enforcement (Beginner - Good First Issue)
  - Target File: [`.github/workflows/ci.yml`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/.github/workflows/ci.yml)
- **[#36](https://github.com/broda-spendy/privacy-shield-payments/issues/36)** `[DX]` Add Code Coverage Reporting to CI (Beginner)
  - Target File: [`.github/workflows/ci.yml`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/.github/workflows/ci.yml)
- **[#37](https://github.com/broda-spendy/privacy-shield-payments/issues/37)** `[DX]` Write SDK Documentation & Usage Examples (Beginner - Good First Issue)
  - Target File: [`docs/interface.md`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/docs/interface.md)

### 5. Testing, Hardening & Operations
- **[#7](https://github.com/broda-spendy/privacy-shield-payments/issues/7)** `[Phase 1]` Fix: `arbitrary`/`derive_arbitrary` Version Skew in testutils (Beginner)
  - Target File: [`contracts/shield/Cargo.toml`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/Cargo.toml)
- **[#8](https://github.com/broda-spendy/privacy-shield-payments/issues/8)** `[Phase 1]` Add `wasm32-unknown-unknown` CI Target Build (Beginner)
  - Target File: [`.github/workflows/ci.yml`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/.github/workflows/ci.yml)
- **[#9](https://github.com/broda-spendy/privacy-shield-payments/issues/9)** `[Phase 1]` Improve Error Messages in `ShieldError` Variants (Beginner - Good First Issue)
  - Target File: [`contracts/shield/src/errors.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/errors.rs)
- **[#10](https://github.com/broda-spendy/privacy-shield-payments/issues/10)** `[Phase 1]` Add Property-Based Tests for Pool Arithmetic (Intermediate)
  - Target File: [`contracts/shield/src/pool.rs`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/contracts/shield/src/pool.rs)
- **[#11](https://github.com/broda-spendy/privacy-shield-payments/issues/11)** `[Phase 1]` Add `CONTRIBUTING.md` with Local Development Guide (Beginner)
  - Target File: [`CONTRIBUTING.md`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/CONTRIBUTING.md)
- **[#27](https://github.com/broda-spendy/privacy-shield-payments/issues/27)** `[Phase 5]` Deploy Shield Contract to Stellar Testnet & Publish Contract ID (Intermediate)
- **[#28](https://github.com/broda-spendy/privacy-shield-payments/issues/28)** `[Phase 5]` Write Integration Tests Against Live Testnet Contract (Advanced)
- **[#30](https://github.com/broda-spendy/privacy-shield-payments/issues/30)** `[Phase 5]` Add Load Test for Deposit/Transfer Throughput on Testnet (Intermediate)
- **[#31](https://github.com/broda-spendy/privacy-shield-payments/issues/31)** `[Phase 6]` Security Review: Enumerate Attack Surfaces (Advanced)
  - Target File: [`docs/threat-model.md`](https://github.com/broda-spendy/privacy-shield-payments/blob/main/docs/threat-model.md)
- **[#32](https://github.com/broda-spendy/privacy-shield-payments/issues/32)** `[Phase 6]` Write Mainnet Deployment Runbook (Intermediate)
- **[#33](https://github.com/broda-spendy/privacy-shield-payments/issues/33)** `[Phase 6]` Add Monitoring: Stellar Indexer Health & Alert Setup (Intermediate)

---

## 🛠️ Contributor Workflow

1. Fork the repository on GitHub.
2. Clone your fork locally and checkout the `main` branch (`git checkout main`).
3. Create a feature branch from `main` (`git checkout -b feature/issue-14-range-proofs`).
4. Implement your changes and run `cargo test --workspace`.
5. Open a Pull Request targeting **base branch: `main`**.
