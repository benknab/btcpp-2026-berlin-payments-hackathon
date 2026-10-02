import { Schema } from "effect";

import { PaymentHash } from "./bolt11";
import { InviteKey, ParticipantRequest } from "./group-input";

const MAX_INVOICE_LENGTH = 10_000;
const Invoice = Schema.String.pipe(Schema.check(Schema.isMinLength(1), Schema.isMaxLength(MAX_INVOICE_LENGTH)));
export const PrepareEventPayout = Schema.Struct({ ...ParticipantRequest.fields, invoice: Invoice });
export const EventPayoutRequest = Schema.Struct({ inviteKey: InviteKey, paymentHash: PaymentHash });
export const ConfirmEventPayout = Schema.Struct({ ...EventPayoutRequest.fields, preimage: PaymentHash });
