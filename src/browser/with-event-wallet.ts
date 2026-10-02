import type { Wallet } from "@secondts/bark/web";

import { openEventWallet } from "./event-wallet";

/** All app operations share a cross-tab lock, including sync and spending. */
export function withEventWallet<Value>(
  arkAddress: string,
  operation: (wallet: Readonly<Wallet>) => Promise<Value>,
): Promise<Value> {
  return navigator.locks.request(`bark-event-wallet:${arkAddress}`, async (): Promise<Value> => {
    const wallet = await openEventWallet(arkAddress);
    try {
      return await operation(wallet);
    } finally {
      wallet.free();
    }
  });
}
