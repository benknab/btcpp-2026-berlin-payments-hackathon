import type { EventWalletBalance } from "@/browser/wallet-balance";
import { useState } from "react";

import { useAction } from "./use-action";

async function syncWallet(address: string): Promise<EventWalletBalance> {
  const { syncEventWallet } = await import("@/browser/wallet-balance");
  return syncEventWallet(address);
}

export function useWalletBalance(address: string): {
  readonly balance: EventWalletBalance | null;
  readonly pending: boolean;
  readonly error: string | null;
  readonly sync: () => void;
} {
  const [balance, setBalance] = useState<EventWalletBalance | null>(null);
  const action = useAction();
  function sync(): void {
    action.run(async () => {
      setBalance(await syncWallet(address));
    }, "Could not sync the wallet. Use the browser that created this event and check your connection.");
  }
  return { balance, pending: action.pending, error: action.error, sync };
}
