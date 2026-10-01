import { calculateObligations } from "@/lib/pot";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { calculateBalances, splitEqually } from "./accounting";
import { netDebts } from "./group-settlement";

it.effect("nets Kittysplit balances into the exact pot obligations, including rounding", () =>
  Effect.gen(function* test() {
    const ids = ["alice", "bob", "carol"];
    const expenses = [
      { payerId: "alice", amountSats: 90, shares: yield* splitEqually(90, ids) },
      { payerId: "bob", amountSats: 60, shares: yield* splitEqually(60, ids) },
    ];
    const balances = yield* calculateBalances({ participantIds: ids, expenses, contributions: [] });
    const debts = yield* netDebts(balances);
    expect(debts).toStrictEqual([
      { from: "carol", to: "alice", amountSat: 40 },
      { from: "carol", to: "bob", amountSat: 10 },
    ]);
    const obligations = yield* calculateObligations({
      id: "test",
      debts,
      users: ids.map((id, index) => ({
        id,
        name: id,
        arkAddress: ["tark1ace", "tark1q0q", "tark1car0l"][index] ?? "",
      })),
    });
    expect(obligations.map((entry) => entry.receiveSat - entry.payInSat)).toStrictEqual([40, 10, -50]);
    const rounded = yield* calculateBalances({
      participantIds: ids,
      expenses: [{ payerId: "bob", amountSats: 10, shares: yield* splitEqually(10, ids) }],
      contributions: [],
    });
    expect((yield* netDebts(rounded)).reduce((sum, debt) => sum + debt.amountSat, 0)).toBe(7);
    expect(
      yield* netDebts(yield* calculateBalances({ participantIds: ids, expenses: [], contributions: [] })),
    ).toStrictEqual([]);
  }),
);
