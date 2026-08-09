import { Address, Contract, Keypair, Networks, TransactionBuilder, BASE_FEE, xdr } from "@stellar/stellar-sdk";
import { envRequired, contractId, i128, rpc } from "./common";

/**
 * Performs a confidential transfer from `from` to `to`.
 *
 * Phase 1: the proof is a MockProof { amount, nonce } — the amount travels
 * in cleartext and there is no real cryptographic verification. The call
 * shape is identical to what Phase 2+ will use with a real proof.
 */
async function main() {
  const server = rpc();
  const id = contractId();
  const from = Keypair.fromSecret(envRequired("SENDER_SECRET"));
  const to = Keypair.fromSecret(envRequired("RECIPIENT_SECRET"));
  const amount = 250n;

  const contract = new Contract(id);
  const source = await server.getAccount(from.publicKey());

  // Phase 1 mock proof: amount in cleartext + a nonce.
  // ProofKind::Mock is a union; the canonical XDR is [symbol, payload].
  const proof = xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("Mock"),
    xdr.ScVal.scvVec([i128(amount), xdr.ScVal.scvBytes(Buffer.alloc(32, 9))]),
  ]);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        "confidential_transfer",
        new Address(from.publicKey()).toScVal(),
        new Address(to.publicKey()).toScVal(),
        proof,
      ),
    )
    .setTimeout(30)
    .build();

  tx.sign(from);
  const result = await server.sendTransaction(tx);
  console.log(`Confidential transfer submitted: ${result.hash}`);
  console.log(
    "NOTE: Phase 1 uses a MockProof (amount in cleartext, no real ZK verification). See docs/threat-model.md.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
