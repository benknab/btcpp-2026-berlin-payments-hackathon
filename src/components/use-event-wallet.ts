import { useRef } from "react";

async function createWallet(id: string): Promise<string> {
  const { createEventWallet } = await import("@/browser/event-wallet");
  return createEventWallet(id);
}

export function useEventWallet(): () => Promise<string> {
  const walletId = useRef<string | null>(null);
  return (): Promise<string> => {
    const id = walletId.current ?? crypto.randomUUID();
    walletId.current = id;
    return createWallet(id);
  };
}
