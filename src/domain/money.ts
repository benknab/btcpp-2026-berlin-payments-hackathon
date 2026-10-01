import { Schema } from "effect";

export const MAX_SATS = 2_100_000_000_000_000;
export const Sats = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isBetween({ minimum: 0, maximum: MAX_SATS })),
);
export const PositiveSats = Sats.pipe(Schema.check(Schema.isGreaterThan(0)));

export function formatSats(amount: number): string {
  return `${new Intl.NumberFormat("en-US").format(amount)} sats`;
}
