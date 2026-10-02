import { Withdrawal } from "@/domain/withdrawal";
import type { WalletWithdrawal } from "@/domain/withdrawal";
import { Schema } from "effect";

const PREFIX = "bark:mainnet:wallet-withdrawal:";
export const WITHDRAWAL_CHANGED = "wallet-withdrawal-changed";
const decode = Schema.decodeUnknownSync(Schema.fromJsonString(Withdrawal));

export function readWithdrawal(arkAddress: string): WalletWithdrawal | null {
  const stored = localStorage.getItem(`${PREFIX}${arkAddress}`);
  return stored === null ? null : decode(stored);
}

export function saveWithdrawal(arkAddress: string, withdrawal: WalletWithdrawal): void {
  localStorage.setItem(`${PREFIX}${arkAddress}`, JSON.stringify(withdrawal));
  globalThis.dispatchEvent(new Event(WITHDRAWAL_CHANGED));
}
