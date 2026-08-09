# Privacy-Shield Payments — SDK Examples

Working TypeScript examples for interacting with the
Privacy-Shield Payments contract on Stellar testnet.

## Prerequisites

- Node.js 18+
- A deployed contract instance (see `PRD.md` Phase 5) with `initialize`
  already called
- Two funded testnet accounts (use the [Friendbot](https://laboratory.stellar.org/#account-creator))

## Setup

```bash
npm install
```

## Environment variables

| Variable | Required by | Description |
|----------|-------------|-------------|
| `STELLAR_RPC_URL` | all | Testnet RPC endpoint (e.g. `https://soroban-testnet.stellar.org`) |
| `CONTRACT_ID` | all | Deployed contract id (C-prefixed address) |
| `ACCOUNT_SECRET` | deposit, balance | Signing secret key (S-prefixed) |
| `SENDER_SECRET` | transfer | Sender secret key |
| `RECIPIENT_SECRET` | transfer | Recipient secret key |

## Run

```bash
export STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
export CONTRACT_ID="C..."
export ACCOUNT_SECRET="S..."
export SENDER_SECRET="S..."
export RECIPIENT_SECRET="S..."

npm run deposit    # shield 1000 units
npm run transfer   # confidential transfer of 250 units
npm run balance    # query shielded balance
```

## Notes

- Phase 1 uses `MockProof` (amount in cleartext, no real ZK verification).
  See `docs/threat-model.md`.
- The examples build XDR call arguments by hand with `@stellar/stellar-sdk`.
  In a real application, generate typed client bindings from the contract
  Wasm (`soroban contract generate`) for compile-time safety.
