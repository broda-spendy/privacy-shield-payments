import { Contract, Keypair, Networks, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import { accountFromSecret, addressScVal, contractId, rpc } from "./common";

/** Queries the shielded balance for the configured account. */
async function main() {
  const server = rpc();
  const id = contractId();
  const keypair = accountFromSecret();

  const contract = new Contract(id);
  const source = await server.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call("balance", addressScVal(keypair.publicKey())),
    )
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.sendTransaction(tx);
  console.log(`Balance query submitted: ${result.hash}`);
  // const parsed = scValToNative(txResult.returnValue);
  // console.log(parsed === null ? "no account yet" : `balance: ${parsed.balance}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
