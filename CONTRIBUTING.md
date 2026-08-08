# Contributing to Privacy-Shield Payments

Thanks for helping out! This project is a Phase 1 scaffold — see `README.md`,
`PRD.md`, and `architecture.md` before diving in. All Phase 2–6 work is
tracked as GitHub issues; check the open issues for good first tasks.

## Prerequisites

- Rust **stable** toolchain (the pinned dependency set is compatible with
  Rust 1.75+; the CI uses `dtolnay/rust-toolchain@stable`).
- The `wasm32-unknown-unknown` target, needed to build the contract as a
  Wasm artifact:

  ```sh
  rustup target add wasm32-unknown-unknown
  ```

- (Optional, for testnet deploys) a Soroban CLI release compatible with the
  pinned `soroban-sdk = "=20.0.0"`.

> Note: several dependencies are **exactly pinned** (`soroban-sdk`,
> `base64ct`, `zeroize`, `derive_arbitrary`) to avoid a known
> arbitrary/derive_arbitrary version-skew bug and `edition2024`-requiring
> transitive upgrades. Do not relax these pins. See the "Resolved" section
> in `README.md` for the full story.

## Building

Native (host) build:

```sh
cargo build --workspace
```

Wasm build (what CI verifies; produces the deployable contract artifact):

```sh
cargo build --workspace --target wasm32-unknown-unknown --release
```

## Testing

```sh
cargo test --workspace
```

With the Soroban test utilities enabled:

```sh
cargo test --workspace --features testutils
```

Both must pass before opening a PR.

## Linting & formatting

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```

`clippy` runs with warnings denied in CI, so keep it clean locally.

## Coverage

CI enforces an 80% line-coverage gate via `cargo-llvm-cov`:

```sh
cargo llvm-cov --workspace --html --output-dir coverage --fail-under-lines 80
```

## How CI works

- `.github/workflows/ci.yml` — `fmt`, `clippy`, `test`, and a
  `wasm32-unknown-unknown` release build.
- `.github/workflows/coverage.yml` — coverage report + 80% gate, uploaded to
  Codecov.

Run the same commands locally (above) to reproduce CI before pushing.

## Pull request checklist

- [ ] Logical changes are accompanied by unit tests that pass.
- [ ] New public contract API is documented (`///` doc comments) and reflected
      in `docs/interface.md`.
- [ ] `cargo fmt --all -- --check` passes.
- [ ] `cargo clippy --workspace --all-targets -- -D warnings` passes.
- [ ] `cargo test --workspace --features testutils` passes.
- [ ] Wasm build passes: `cargo build --workspace --target wasm32-unknown-unknown --release`.
- [ ] If you add or change dependencies, keep the exact-pin convention and
      update `Cargo.lock` in the same commit.
- [ ] Describe the change and link the issue(s) it resolves in the PR body.

## Security notes

This is a Phase 1 scaffold with **no real privacy guarantees** — proof
verification is mocked. Never claim production readiness, and never add
`unsafe` blocks without an explicit rationale. See `docs/threat-model.md`.
