import { withEventWallet } from "./with-event-wallet";

export interface EventWalletBalance {
  readonly spendableSats: number;
  readonly nextRefreshHeight: number | null;
}

export function syncEventWallet(arkAddress: string): Promise<EventWalletBalance> {
  return withEventWallet(arkAddress, async (wallet): Promise<EventWalletBalance> => {
    await wallet.sync();
    const balance = await wallet.balance();
    const nextRefreshHeight = (await wallet.getNextRequiredRefreshBlockheight()) ?? null;
    return { spendableSats: balance.spendableSats, nextRefreshHeight };
  });
}
