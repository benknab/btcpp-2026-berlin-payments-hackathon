import { Schema } from "effect";

import { PaymentHash } from "./bolt11";
import { InviteKey, ParticipantRequest } from "./group-input";

const MAX_INVOICE_LENGTH = 10_000;
const Invoice = Schema.String.pipe(Schema.check(Schema.isMinLength(1), Schema.isMaxLength(MAX_INVOICE_LENGTH)));
export const PrepareEventPayout = Schema.Struct({
  ...ParticipantRequest.fields,
  destination: Schema.String,
  invoice: Schema.optional(Invoice),
});
const MovementId = Schema.Number.pipe(Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)));
export const EventPayoutRequest = Schema.Struct({
  inviteKey: InviteKey,
  paymentHash: PaymentHash,
  historyStartId: Schema.optional(MovementId),
});
export const ReleaseEventPayout = Schema.Struct({
  ...EventPayoutRequest.fields,
  historyLastId: MovementId,
  pendingSendCount: MovementId,
});
export const PayoutMovement = Schema.Struct({
  id: MovementId,
  status: Schema.String,
  intendedBalanceSats: Schema.Number.pipe(Schema.check(Schema.isInt())),
  sentToAddresses: Schema.Array(Schema.String),
  lightningOffer: Schema.optional(Schema.String),
  paymentHash: Schema.optional(PaymentHash),
});
export const ConfirmEventPayout = Schema.Struct({
  ...EventPayoutRequest.fields,
  preimage: Schema.optional(PaymentHash),
  movement: Schema.optional(PayoutMovement),
});
