import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { calculateObligations, PotInputSchema } from "./pot";
import type { PotInput, PotError } from "./pot";

const input = {
  id: "dinner",
  users: [
    { id: "alice", name: "Alice", arkAddress: "ark1ace" },
    { id: "bob", name: "Bob", arkAddress: "ark1q0q" },
    { id: "carol", name: "Carol", arkAddress: "ark1car0l" },
    { id: "dave", name: "Dave", arkAddress: "ark1dave" },
  ],
  debts: [
    { from: "alice", to: "bob", amountSat: 7000 },
    { from: "carol", to: "bob", amountSat: 3000 },
    { from: "bob", to: "alice", amountSat: 2000 },
    { from: "dave", to: "carol", amountSat: 4000 },
  ],
} satisfies PotInput;

describe("JSON pot obligations", (): void => {
  it.effect("nets debts in integer sats and conserves the pot", (): Effect.Effect<void, PotError> =>
    Effect.gen(function* test() {
      const obligations = yield* calculateObligations(input);
      expect(obligations).toStrictEqual([
        { userId: "alice", payInSat: 5000, receiveSat: 0 },
        { userId: "bob", payInSat: 0, receiveSat: 8000 },
        { userId: "carol", payInSat: 0, receiveSat: 1000 },
        { userId: "dave", payInSat: 4000, receiveSat: 0 },
      ]);
    }),
  );

  it.effect.each([
    { ...input, users: [] },
    { ...input, users: [...input.users, input.users[0]] },
    { ...input, debts: [{ from: "unknown", to: "bob", amountSat: 1 }] },
    { ...input, debts: [{ from: "bob", to: "bob", amountSat: 1 }] },
    {
      ...input,
      debts: [
        { from: "alice", to: "bob", amountSat: Number.MAX_SAFE_INTEGER },
        { from: "alice", to: "bob", amountSat: 1 },
      ],
    },
  ])("rejects invalid participants or debt references: %j", (invalid: unknown): Effect.Effect<void> =>
    Effect.gen(function* test() {
      const decoded = yield* Effect.result(Schema.decodeUnknownEffect(PotInputSchema)(invalid));
      if (decoded._tag === "Failure") {
        expect(decoded.failure._tag).toBe("SchemaError");
      } else {
        const calculated = yield* Effect.result(calculateObligations(decoded.success));
        expect(calculated._tag).toBe("Failure");
      }
    }),
  );

  it.effect("keeps obligations separate when participants share a payout address", () =>
    Effect.gen(function* test() {
      const shared = {
        ...input,
        users: input.users.map((user) => ({ ...user, arkAddress: "ark1ace" })),
      };
      expect(yield* calculateObligations(yield* Schema.decodeUnknownEffect(PotInputSchema)(shared))).toStrictEqual(
        yield* calculateObligations(input),
      );
    }),
  );

  it.effect.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "rejects non-positive or unsafe debt amount %s",
    (amountSat): Effect.Effect<void> =>
      Effect.gen(function* test() {
        const result = yield* Effect.result(
          Schema.decodeUnknownEffect(PotInputSchema)({ ...input, debts: [{ from: "alice", to: "bob", amountSat }] }),
        );
        expect(result._tag).toBe("Failure");
      }),
  );
});
