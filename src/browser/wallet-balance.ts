import { withEventWallet } from "./with-event-wallet";

export interface EventWalletBalance {
  readonly spendableSats: number;
  readonly nextRefreshHeight: number | null;
}

export function syncEventWallet(arkAddress: string): Promise<EventWalletBalance> {
  return withEventWallet(arkAddress, async (wallet, trace): Promise<EventWalletBalance> => {
    await trace.step("wallet.sync", {}, () => wallet.sync());
    const balance = await trace.step("wallet.balance", {}, () => wallet.balance());
    const nextRefreshHeight =
      (await trace.step("wallet.refresh-height", {}, () => wallet.getNextRequiredRefreshBlockheight())) ?? null;
    await trace.log("wallet.synced", {
      spendableSats: balance.spendableSats,
      nextRefreshHeight: nextRefreshHeight ?? "none",
    });
    return { spendableSats: balance.spendableSats, nextRefreshHeight };
  });
}
