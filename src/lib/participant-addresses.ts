import { MAX_SETTLEMENT_USERS } from "@/lib/settlement";
import { Schema } from "effect";

export const ParticipantAddressRequest = Schema.Struct({
  count: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThan(0), Schema.isLessThanOrEqualTo(MAX_SETTLEMENT_USERS)),
  ),
});

export type ParticipantAddressResult =
  | Readonly<{ ok: true; addresses: readonly string[] }>
  | Readonly<{ ok: false; message: string }>;
