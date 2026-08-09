import { Address, Keypair, SorobanRpc, xdr } from "@stellar/stellar-sdk";

/** Shared helpers for the Privacy-Shield Payments examples. */

export function envRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export function rpc(): SorobanRpc.Server {
  return new SorobanRpc.Server(envRequired("STELLAR_RPC_URL"));
}

export function contractId(): string {
  return envRequired("CONTRACT_ID");
}

export function accountFromSecret(): Keypair {
  return Keypair.fromSecret(envRequired("ACCOUNT_SECRET"));
}

/** Encodes an `i128` the way the contract's `i128` args are decoded. */
export function i128(value: bigint): xdr.ScVal {
  const isNeg = value < 0n;
  const abs = isNeg ? -value : value;
  const lo = xdr.Uint64.fromString((abs & BigInt("0xffffffffffffffff")).toString());
  const hi = xdr.Int64.fromString(isNeg ? "-1" : "0");
  return xdr.ScVal.scvI128(new xdr.Int128Parts({ lo, hi }));
}

/** Encodes an `Address` argument. */
export function addressScVal(publicKey: string): xdr.ScVal {
  return new Address(publicKey).toScVal();
}
