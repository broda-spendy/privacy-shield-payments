import { Contract, Keypair, Networks, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import { accountFromSecret, addressScVal, contractId, i128, rpc } from "./common";

/** Deposits `amount` into the caller's shielded balance. */
async function main() {
  const server = rpc();
  const id = contractId();
  const keypair = accountFromSecret();
  const amount = 1000n;

  const contract = new Contract(id);
  const source = await server.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call("deposit", addressScVal(keypair.publicKey()), i128(amount)),
    )
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.sendTransaction(tx);
  console.log(`Deposit submitted: ${result.hash}`);
  // Optional: poll with server.getTransaction(result.hash) until status is successful.
  // The return value is a ShieldedAccount { owner, balance }.
  // const parsed = scValToNative(txResult.returnValue);
  // console.log(`New balance: ${parsed.balance}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
