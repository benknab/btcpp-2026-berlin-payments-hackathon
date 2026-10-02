import { Effect, Schema } from "effect";

import { PositiveSats, Sats } from "./money";

export const Withdrawal = Schema.Struct({
  id: Schema.String,
  method: Schema.Literals(["bolt11", "bolt12", "ark"]),
  destination: Schema.String,
  invoice: Schema.String,
  paymentHash: Schema.NullOr(Schema.String),
  amountSats: PositiveSats,
  feeSats: Sats,
  historyStartId: Sats,
  status: Schema.Literals(["sending", "paid", "failed"]),
});
export type WalletWithdrawal = typeof Withdrawal.Type;
const BISECTION_DIVISOR = 2;

/** Find the largest integral payment fitting balance plus the SDK's monotonic send fee. */
export const maximumWithdrawal = Effect.fn("maximumWithdrawal")(function* maximumWithdrawal(
  balanceSats: number,
  estimateFee: (amountSats: number) => Effect.Effect<number, unknown>,
) {
  yield* Schema.decodeUnknownEffect(Sats)(balanceSats);
  let lower = 1;
  let upper = balanceSats;
  let amountSats = 0;
  let feeSats = 0;
  while (lower <= upper) {
    const candidate = lower + Math.floor((upper - lower) / BISECTION_DIVISOR);
    const fee = yield* estimateFee(candidate).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Sats)));
    if (candidate + fee <= balanceSats) {
      amountSats = candidate;
      feeSats = fee;
      lower = candidate + 1;
    } else {
      upper = candidate - 1;
    }
  }
  return { amountSats, feeSats };
});
