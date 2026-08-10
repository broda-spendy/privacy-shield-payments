import { Address, Contract, Keypair, Networks, SorobanRpc, TransactionBuilder, BASE_FEE, xdr } from "@stellar/stellar-sdk";
import { envRequired, contractId, i128, rpc } from "./common";
import { randomBytes } from "crypto";

/**
 * Phase 3: selective disclosure — record a disclosure key for one transfer,
 * then verify it as the auditor would.
 *
 * Steps:
 *   1. sender performs a confidential_transfer and captures the returned
 *      `transfer_id` (bytes).
 *   2. sender calls `record_disclosure_request` with a random viewing key.
 *   3. the auditing tool calls `verify_disclosure` with the same key and
 *      prints the real amount and parties.
 *
 * The viewing key reveals only this one transfer; it cannot be used to read
 * any other transfer in the pool.
 */
async function main() {
  const server = rpc();
  const id = contractId();
  const sender = Keypair.fromSecret(envRequired("SENDER_SECRET"));
  const recipient = Keypair.fromSecret(envRequired("RECIPIENT_SECRET"));
  const amount = 250n;

  const contract = new Contract(id);
  const source = await server.getAccount(sender.publicKey());

  // 1. Confidential transfer. Phase 1 mock proof (amount in cleartext).
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
        new Address(sender.publicKey()).toScVal(),
        new Address(recipient.publicKey()).toScVal(),
        proof,
      ),
    )
    .setTimeout(30)
    .build();
  tx.sign(sender);

  const txResult = await server.sendTransaction(tx);
  if (txResult.status === "ERROR") {
    throw new Error(`transfer failed: ${JSON.stringify(txResult)}`);
  }
  console.log(`Confidential transfer submitted: ${txResult.hash}`);

  // Wait for inclusion so the contract's returnValue (the transfer_id) is
  // available on the parsed transaction.
  let transferIdBytes: Buffer | undefined;
  for (let i = 0; i < 20; i++) {
    const res = await server.getTransaction(txResult.hash);
    if (res.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      const rv = res.returnValue;
      if (rv && rv.switch() === xdr.ScValType.scvBytes()) {
        transferIdBytes = rv.value() as Buffer;
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!transferIdBytes) {
    throw new Error("could not read transfer_id from transaction result");
  }
  console.log(`transfer_id: 0x${transferIdBytes.toString("hex")}`);

  // 2. Sender records a disclosure for this transfer with a fresh viewing key.
  const viewingKey = randomBytes(32);
  const recordAuth = await server.getAccount(sender.publicKey());
  const keyScVal = xdr.ScVal.scvVec([
    xdr.ScVal.scvBytes(transferIdBytes),
    xdr.ScVal.scvBytes(viewingKey),
  ]);

  const recordTx = new TransactionBuilder(recordAuth, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        "record_disclosure_request",
        new Address(sender.publicKey()).toScVal(),
        keyScVal,
      ),
    )
    .setTimeout(30)
    .build();
  recordTx.sign(sender);
  const recordResult = await server.sendTransaction(recordTx);
  console.log(`record_disclosure_request submitted: ${recordResult.hash}`);

  // 3. Auditor verifies with the out-of-band key.
  const verifyAuth = await server.getAccount(recipient.publicKey());
  const verifyTx = new TransactionBuilder(verifyAuth, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        "verify_disclosure",
        xdr.ScVal.scvVec([
          xdr.ScVal.scvBytes(transferIdBytes),
          xdr.ScVal.scvBytes(viewingKey),
        ]),
      ),
    )
    .setTimeout(30)
    .build();
  verifyTx.sign(recipient);
  const verifyResult = await server.sendTransaction(verifyTx);
  console.log(`verify_disclosure submitted: ${verifyResult.hash}`);
  console.log("Hold on to the viewing key — it reveals ONLY this transfer.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
