import { Effect, Schema } from "effect";

export const Sats = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })),
);
const PositiveSats = Sats.pipe(Schema.check(Schema.isGreaterThan(0)));
const MAX_IDENTIFIER_LENGTH = 100;
const Identifier = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[\w-]+$/u), Schema.isMaxLength(MAX_IDENTIFIER_LENGTH)),
);
export const MainnetAddress = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^ark1[023456789acdefghjklmnpqrstuvwxyz]+$/u)),
);

export function isMainnetAddress(value: string): boolean {
  return Schema.is(MainnetAddress)(value);
}

export const PotInputSchema = Schema.Struct({
  id: Identifier,
  users: Schema.Array(Schema.Struct({ id: Identifier, name: Schema.NonEmptyString, arkAddress: MainnetAddress })),
  debts: Schema.Array(Schema.Struct({ from: Identifier, to: Identifier, amountSat: PositiveSats })),
});
export type PotInput = typeof PotInputSchema.Type;

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory, not an Error constructor.
export class PotError extends Schema.TaggedError<PotError>()("PotError", { message: Schema.String }) {}

export interface Obligation {
  readonly userId: string;
  readonly payInSat: number;
  readonly receiveSat: number;
}

const initialBalances = Effect.fn("initialPotBalances")(function* initialBalances(input: PotInput) {
  const balances = new Map(input.users.map((user): [string, number] => [user.id, 0]));
  const addresses = new Set(input.users.map((user): string => user.arkAddress));
  if (input.users.length === 0 || balances.size !== input.users.length || addresses.size !== input.users.length) {
    return yield* new PotError({
      message: "Users must have unique IDs and payout addresses; at least one is required",
    });
  }
  return balances;
});

const debtBalances = Effect.fn("potDebtBalances")(function* debtBalances(
  balances: Readonly<ReadonlyMap<string, number>>,
  debt: PotInput["debts"][number],
) {
  const from = balances.get(debt.from);
  const to = balances.get(debt.to);
  if (from === undefined || to === undefined || debt.from === debt.to) {
    return yield* new PotError({ message: "Debts must reference two different participants" });
  }
  const debit = from - debt.amountSat;
  const credit = to + debt.amountSat;
  if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit)) {
    return yield* new PotError({ message: "Debt totals exceed safe integer sats" });
  }
  return { debit, credit };
});

export const calculateObligations = Effect.fn("calculateObligations")(function* calculateObligations(input: PotInput) {
  const balances = yield* initialBalances(input);
  for (const debt of input.debts) {
    const { debit, credit } = yield* debtBalances(balances, debt);
    balances.set(debt.from, debit);
    balances.set(debt.to, credit);
  }
  const obligations = Array.from(balances, ([userId, balance]: readonly [string, number]): Obligation => ({
    userId,
    payInSat: Math.max(0, -balance),
    receiveSat: Math.max(0, balance),
  }));
  const total = obligations.reduce((sum, obligation): number => sum + obligation.payInSat, 0);
  if (!Number.isSafeInteger(total)) {
    return yield* new PotError({ message: "Pot total exceeds safe integer sats" });
  }
  return obligations;
});

export const PotParticipantSchema = Schema.Struct({
  userId: Identifier,
  name: Schema.NonEmptyString,
  payoutAddress: MainnetAddress,
  depositAddress: MainnetAddress,
  payInSat: Sats,
  receiveSat: Sats,
  receivedSat: Sats,
  receiptMovementIds: Schema.Array(Sats),
  payoutStatus: Schema.Literals(["not-needed", "pending", "sending", "paid"]),
  payoutHistoryCursor: Sats,
  payoutMovementId: Schema.NullOr(Sats),
});
export type PotParticipant = typeof PotParticipantSchema.Type;

export const PotSchema = Schema.Struct({
  id: Identifier,
  walletFingerprint: Schema.NonEmptyString,
  revision: Sats,
  status: Schema.Literals(["collecting", "paying", "settled"]),
  totalSat: Sats,
  participants: Schema.Array(PotParticipantSchema),
});
export type Pot = typeof PotSchema.Type;
