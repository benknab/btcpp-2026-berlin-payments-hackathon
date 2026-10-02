import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { calculateBalances, splitEqually } from "./accounting";
import { DEMO_PEOPLE, DEMO_PRESETS } from "./demo-presets";
import { NewGroup } from "./group-input";
import { payoutDestination } from "./payout-destination";

describe("demo preset payment scenarios", () => {
  it.effect("validates every supplied name and receiving destination", () =>
    Effect.gen(function* verifyPeople() {
      expect.hasAssertions();
      const [owner, ...guests] = DEMO_PEOPLE;
      expect(owner?.name).toBe("Vini");
      yield* Schema.decodeUnknownEffect(NewGroup)({
        name: "Demo",
        organizerName: owner?.name,
        organizerLnurl: owner?.address,
        participantNames: guests.map((person) => person.name),
        participantLnurls: guests.map((person) => person.address),
      });
      expect(DEMO_PEOPLE.map((person) => payoutDestination(person.address)?.kind)).toStrictEqual([
        "bolt12",
        "lnurl",
        "lnurl",
        "lnurl",
      ]);
    }),
  );

  it.effect.each(DEMO_PRESETS)("nets $name into the intended small payment scenario", (preset) =>
    Effect.gen(function* verifyBalances() {
      expect.hasAssertions();
      const ids = DEMO_PEOPLE.map((person) => person.name);
      const expenses = yield* Effect.all(
        preset.expenses.map((expense) =>
          splitEqually(expense.amountSats, ids).pipe(
            Effect.map((shares) => ({ payerId: expense.payer, amountSats: expense.amountSats, shares })),
          ),
        ),
      );
      const balances = yield* calculateBalances({ participantIds: ids, expenses, contributions: [] });
      const expected = {
        coffee: { Vini: -50, Ben: 150, Dingo: -50, MintMonkey: -50 },
        dinner: { Vini: -75, Ben: 125, Dingo: 25, MintMonkey: -75 },
        weekend: { Vini: 175, Ben: -25, Dingo: -65, MintMonkey: -85 },
      };
      expect(
        Object.fromEntries(balances.map((balance) => [balance.participantId, balance.settlementSats])),
      ).toStrictEqual(expected[preset.id]);
    }),
  );
});
