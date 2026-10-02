import { telemetryReference } from "@/lib/telemetry";
import type { Wallet } from "@secondts/bark/web";

import { openEventWallet } from "./event-wallet";
import { browserOperation } from "./telemetry";
import type { BrowserTrace } from "./telemetry";

export type { BrowserTrace } from "./telemetry";

/** All app operations share a cross-tab lock, including sync and spending. */
export function withEventWallet<Value>(
  arkAddress: string,
  operation: (wallet: Readonly<Wallet>, trace: BrowserTrace) => Promise<Value>,
): Promise<Value> {
  return browserOperation("wallet.operation", async (trace) => {
    await trace.log("wallet.lock.waiting", { walletRef: await telemetryReference(arkAddress) });
    return navigator.locks.request(`bark-event-wallet:${arkAddress}`, async (): Promise<Value> => {
      await trace.log("wallet.lock.acquired", {});
      const wallet = await trace.step("wallet.open", {}, () => openEventWallet(arkAddress));
      try {
        return await operation(wallet, trace);
      } finally {
        wallet.free();
      }
    });
  });
}
