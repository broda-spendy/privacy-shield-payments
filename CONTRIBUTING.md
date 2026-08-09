# Contributing to Privacy-Shield Payments

Thanks for contributing. This guide covers local setup, build/test commands, branch naming, PR expectations, and how we pin dependencies.

## Prerequisites

Install the following before you start:

| Tool | Notes |
|------|--------|
| **Rust (stable)** | Install via [rustup](https://rustup.rs/). Use the current stable toolchain. |
| **`wasm32-unknown-unknown`** | Required for Soroban contract builds: `rustup target add wasm32-unknown-unknown` |
| **`soroban-cli`** | Stellar/Soroban CLI for contract deploy and interaction. Install with: `cargo install --locked soroban-cli` (or follow the current [Stellar docs](https://developers.stellar.org/docs/tools/developer-tools)). Optional for day-to-day `cargo build` / `cargo test` on Phase 1 work, but needed for deploy and on-chain workflows. |

Optional but useful:

- `rustfmt` and `clippy` (usually included with the stable toolchain / CI components)
- A GitHub account and `gh` CLI if you prefer opening PRs from the terminal

## Local build

From the repository root:

```bash
cargo build --workspace
```

Release / WASM-oriented build (used in CI and for contract artifacts):

```bash
cargo build --workspace --target wasm32-unknown-unknown --release
```

## Running tests

Default workspace tests:

```bash
cargo test --workspace
```

With Soroban testutils (preferred for contract unit tests):

```bash
cargo test --workspace --features testutils
```

Formatting and lint checks (same spirit as CI):

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```

## Branch naming conventions

Use short, descriptive branch names with a type prefix:

| Prefix | Use for |
|--------|---------|
| `fix/` | Bug fixes |
| `feat/` | New features |
| `docs/` | Documentation only |
| `chore/` | Tooling, CI, dependency housekeeping |
| `test/` | Tests only |

Examples:

- `docs/add-contributing-guide`
- `fix/derive-arbitrary-pin`
- `feat/pedersen-commitment`

If the work tracks a GitHub issue, include the number when helpful, e.g. `docs/11-contributing-md`.

## Pull request checklist

Before opening a PR, confirm:

- [ ] `cargo build --workspace` succeeds
- [ ] `cargo test --workspace --features testutils` succeeds (zero failures)
- [ ] `cargo fmt --all -- --check` and `cargo clippy --workspace --all-targets -- -D warnings` are clean (no new warnings)
- [ ] Docs updated when behavior, setup, or public interface changes (`README.md`, `architecture.md`, `docs/`, or this file)
- [ ] PR description links the related issue (e.g. `Closes #11`)
- [ ] No secrets, keys, or local env files are committed

CI (`.github/workflows/ci.yml`) runs format, clippy, build, and tests on pull requests. Aim for a green run before requesting review.

## How to pin new dependencies

Prefer **exact version pins** (`=x.y.z`) for Soroban-related crates and anything that historically breaks under caret ranges. This repo already does this for `soroban-sdk`, `base64ct`, `zeroize`, and `derive_arbitrary` in `contracts/shield/Cargo.toml`.

### Lesson: `derive_arbitrary` / `arbitrary` skew

`soroban-env-common` pins `arbitrary = "=1.3.2"`, but `arbitrary` declared `derive_arbitrary` with a non-exact requirement. Cargo could resolve a newer `derive_arbitrary` that generates `try_size_hint` calls against an older `arbitrary` trait crate that does not implement that method — a dependency-graph version skew, not a bug in this contract’s logic.

**What we do:** pin the companion crate explicitly in `[dev-dependencies]`:

```toml
derive_arbitrary = "=1.3.2"
```

When adding or bumping dependencies:

1. Prefer `=x.y.z` for Soroban SDK stack crates and known-fragile transitive deps.
2. After changing pins, run `cargo test --workspace --features testutils` and fix any resolution/compile errors before opening a PR.
3. Document non-obvious pins in the PR description (and in `README.md` if the pin works around an upstream issue).

Also watch for crates that require newer Rust editions (e.g. `edition2024`) than this workspace supports; pin to a compatible older version when needed.

## Environment verification

The steps in this guide were verified on:

| Item | Value |
|------|--------|
| **OS** | Windows 10 (build 26100), `x86_64-pc-windows-msvc` |
| **Rust** | stable (`rustc` 1.94.0) |
| **Target** | `wasm32-unknown-unknown` installed via rustup |
| **Commands checked** | `cargo build --workspace`, `cargo test --workspace --features testutils` |

If you hit environment-specific issues (especially offline `rustup` or older toolchains), see the historical notes in `README.md` under the resolved `testutils` build blocker.

## Where to learn more

- `README.md` — project status and layout
- `architecture.md` — system design and module breakdown
- `PRD.md` — product requirements and phased roadmap
- `docs/interface.md` — public interface reference
- `docs/threat-model.md` — privacy / threat model (Phase 1 has no real privacy guarantees)

## Questions

Open a GitHub issue in this repository if something in the setup guide is unclear or wrong for your platform.
