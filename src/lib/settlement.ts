import type { Pot, PotParticipant } from "@/lib/pot";
import { PotInputSchema, PotSchema } from "@/lib/pot";
import { Schema } from "effect";

export const MAX_SETTLEMENT_USERS = 20;
export const MAX_SETTLEMENT_DEBTS = 100;
const MIN_SETTLEMENT_USERS = 2;

export const SettlementSetup = Schema.Struct({
  users: PotInputSchema.fields.users.pipe(
    Schema.check(Schema.isMinLength(MIN_SETTLEMENT_USERS), Schema.isMaxLength(MAX_SETTLEMENT_USERS)),
  ),
  debts: PotInputSchema.fields.debts.pipe(
    Schema.check(Schema.isMinLength(1), Schema.isMaxLength(MAX_SETTLEMENT_DEBTS)),
  ),
});
export type SettlementSetupInput = typeof SettlementSetup.Type;

export const SettlementCreate = Schema.Struct({ setup: SettlementSetup });
export const SettlementRequest = Schema.Struct({ id: PotSchema.fields.id });
export const SettlementPay = Schema.Struct({ ...SettlementRequest.fields, reviewed: Schema.Literal(true) });

export type SettlementResult =
  | Readonly<{ ok: true; pot: Pot | null }>
  | Readonly<{ ok: false; message: string; pot: Pot | null }>;

export function potFullyFunded(pot: Pot): boolean {
  return pot.participants.every((participant): boolean => participant.receivedSat >= participant.payInSat);
}

export function remainingDepositSat(pot: Pot): number {
  return pot.participants.reduce(
    (sum, participant): number => sum + Math.max(0, participant.payInSat - participant.receivedSat),
    0,
  );
}

export function participantPayoutLabel(participant: PotParticipant): string {
  if (participant.receiveSat === 0) {
    return "Not needed";
  }
  if (participant.payoutStatus === "paid") {
    return `Paid · receipt ${participant.payoutMovementId}`;
  }
  if (participant.payoutStatus === "sending") {
    return "Needs reconciliation";
  }
  return "Not sent";
}

export function potStatusLabel(pot: Pot): string {
  return { settled: "Settled", paying: "Payout in progress", collecting: "Collecting deposits" }[pot.status];
}

export function payoutFundingMessage(pot: Pot, needsRefresh: boolean): string {
  if (pot.status === "settled") {
    return "All payouts are confirmed. This pot is complete.";
  }
  if (needsRefresh) {
    return "Refresh first. The previous request may have sent funds; do not manually resend.";
  }
  if (potFullyFunded(pot)) {
    return "All participant contributions are confirmed. The server will recheck before paying.";
  }
  return `Waiting for ${remainingDepositSat(pot).toLocaleString()} sats across the required deposits.`;
}
