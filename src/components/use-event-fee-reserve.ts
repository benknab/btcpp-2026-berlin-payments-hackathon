import { refreshContributions } from "@/server/event-funding";
import { eventPage } from "@/server/event-page";
import { createWalletTopUpInvoice } from "@/server/wallet-top-up";
import { useState } from "react";

import { useEventAction } from "./use-event-action";

async function prepareReserve(inviteKey: string, arkAddress: string): Promise<number> {
  await refreshContributions({ data: { inviteKey } });
  const current = await eventPage({ data: { inviteKey } });
  const { estimateEventReserve } = await import("@/browser/event-fee-reserve");
  const estimate = await estimateEventReserve(arkAddress, current);
  if (estimate.depositSats > 0) {
    await createWalletTopUpInvoice({ data: { inviteKey, amountSats: estimate.depositSats } });
  }
  return estimate.feeSats;
}

export function useEventFeeReserve(
  inviteKey: string,
  arkAddress: string,
): ReturnType<typeof useEventAction> & {
  readonly requiredSats: number | null;
  readonly prepare: () => void;
  readonly check: () => void;
} {
  const action = useEventAction();
  const [requiredSats, setRequiredSats] = useState<number | null>(null);
  function prepare(): void {
    action.run(async () => {
      setRequiredSats(await prepareReserve(inviteKey, arkAddress));
    }, "Could not estimate the fee reserve. Check the wallet and receiving service.");
  }
  function check(): void {
    action.run(async () => {
      await refreshContributions({ data: { inviteKey } });
    }, "Could not check the fee deposit. Try again.");
  }
  return { ...action, requiredSats, prepare, check };
}
