import { Schema } from "effect";

import { GroupRequest } from "./group-input";
import { PositiveSats } from "./money";

export const WalletTopUpRequest = Schema.Struct({ ...GroupRequest.fields, amountSats: PositiveSats });
export interface WalletTopUpInvoice {
  readonly invoice: string;
  readonly paymentHash: string;
  readonly amountSats: number;
  readonly expiresAt: number;
}
