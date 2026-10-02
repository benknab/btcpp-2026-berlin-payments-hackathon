import { PositiveSats } from "@/domain/money";
import type { WalletTopUpInvoice } from "@/domain/wallet-top-up";
import { createWalletTopUpInvoice } from "@/server/wallet-top-up";
import { Schema } from "effect";
import { useState } from "react";

import { useEventAction } from "./use-event-action";

interface WalletTopUpState {
  readonly amount: string;
  readonly setAmount: (value: string) => void;
  readonly invoice: WalletTopUpInvoice | null;
  readonly valid: boolean;
  readonly pending: boolean;
  readonly error: string | null;
  readonly generate: () => void;
}

export function useWalletTopUp(inviteKey: string): WalletTopUpState {
  const [amount, setAmount] = useState("500");
  const [invoice, setInvoice] = useState<WalletTopUpInvoice | null>(null);
  const action = useEventAction();
  const valid = Schema.is(PositiveSats)(Number(amount));
  function generate(): void {
    if (!valid) {
      return;
    }
    action.run(async () => {
      setInvoice(await createWalletTopUpInvoice({ data: { inviteKey, amountSats: Number(amount) } }));
    }, "Could not generate the top-up invoice. Check the amount and receiving daemon.");
  }
  return { amount, setAmount, invoice, valid, pending: action.pending, error: action.error, generate };
}
