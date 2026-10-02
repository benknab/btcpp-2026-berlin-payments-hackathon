import { openEventWallet } from "./event-wallet";

export interface EventWalletBalance {
  readonly spendableSats: number;
  readonly nextRefreshHeight: number | null;
}

export async function syncEventWallet(arkAddress: string): Promise<EventWalletBalance> {
  const wallet = await openEventWallet(arkAddress);
  try {
    await wallet.sync();
    const balance = await wallet.balance();
    const nextRefreshHeight = (await wallet.getNextRequiredRefreshBlockheight()) ?? null;
    return { spendableSats: balance.spendableSats, nextRefreshHeight };
  } finally {
    wallet.free();
  }
}
