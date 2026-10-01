import { PotInputSchema, SignetAddress } from "@/lib/pot";
import { Effect, Schema } from "effect";

import type { ParticipantBalance } from "./accounting";
import { AccountingError } from "./accounting";
import { EntityId, InviteKey, ParticipantName, ParticipantRequest } from "./group-input";

export const PersonalPaymentRequest = Schema.Struct({ accessKey: InviteKey });
export const SavePersonalAddress = Schema.Struct({ ...PersonalPaymentRequest.fields, arkAddress: SignetAddress });
export const IssuePersonalLink = ParticipantRequest;
export const CloseGroupRequest = Schema.Struct({
  inviteKey: InviteKey,
  fingerprint: InviteKey,
  reviewed: Schema.Literal(true),
});
export const PayGroupRequest = Schema.Struct({ inviteKey: InviteKey, reviewed: Schema.Literal(true) });

export const GroupSettlementSnapshot = Schema.Struct({
  id: EntityId,
  users: Schema.Array(Schema.Struct({ id: EntityId, name: ParticipantName, arkAddress: Schema.NullOr(SignetAddress) })),
  debts: PotInputSchema.fields.debts,
});
export type SettlementSnapshot = typeof GroupSettlementSnapshot.Type;

/** Deterministic net transfers into Ben's pot, not a new expense split or payment authorization. */
export const netDebts = Effect.fn("netDebts")(function* netDebts(balances: readonly ParticipantBalance[]) {
  if (
    balances.some((balance) => !Number.isSafeInteger(balance.expenseBalanceSats)) ||
    balances.reduce((sum, balance) => sum + BigInt(balance.expenseBalanceSats), 0n) !== 0n
  ) {
    return yield* new AccountingError({ message: "Net expense balances must conserve every sat." });
  }
  const creditors = balances
    .filter((entry) => entry.expenseBalanceSats > 0)
    .map((entry) => ({ id: entry.participantId, remaining: entry.expenseBalanceSats }));
  const debts: { from: string; to: string; amountSat: number }[] = [];
  for (const debtor of balances.filter((entry) => entry.expenseBalanceSats < 0)) {
    let remaining = -debtor.expenseBalanceSats;
    for (const creditor of creditors) {
      const amountSat = Math.min(remaining, creditor.remaining);
      if (amountSat > 0) {
        debts.push({ from: debtor.participantId, to: creditor.id, amountSat });
        creditor.remaining -= amountSat;
        remaining -= amountSat;
      }
    }
  }
  return debts;
});
