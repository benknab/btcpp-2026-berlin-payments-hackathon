import { listSettlements, loadSettlement, startSettlement } from "@/db/settlements";
import { PotError } from "@/lib/pot";
import type { SettlementSetupInput } from "@/lib/settlement";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { TestWallets, withFixture } from "./settlement-fixture";
import { settlementActionResult } from "./ui-service";

const setup: SettlementSetupInput = {
  users: [
    { id: "alice", name: "Alice", arkAddress: "ark1ace" },
    { id: "bob", name: "Bob", arkAddress: "ark1q0q" },
  ],
  debts: [{ from: "alice", to: "bob", amountSat: 9000 }],
};

describe("backend-managed settlement pots", (): void => {
  it.effect(
    "creates and lists pots without Bark and preserves details when payments are unavailable",
    (): Effect.Effect<void, unknown> =>
      withFixture(() =>
        Effect.gen(function* test() {
          const controls = yield* TestWallets;
          const id = yield* startSettlement();
          const saved = yield* settlementActionResult({ kind: "save", id, setup });
          expect(saved.ok).toBe(true);
          expect((yield* listSettlements()).map((pot) => pot.id)).toStrictEqual([id]);
          expect(controls.calls()).toBe(0);
          controls.fail();
          const result = yield* settlementActionResult({ kind: "prepare", id });
          expect(result).toMatchObject({ ok: false, pot: { id, locked: true, status: "unsettled" } });
          expect((yield* loadSettlement(id)).users).toHaveLength(2);
        }),
      ),
  );

  it.effect(
    "isolates wallet execution per numeric pot ID and derives settled status from confirmed payouts",
    (): Effect.Effect<void, unknown> =>
      withFixture(() =>
        Effect.gen(function* test() {
          const controls = yield* TestWallets;
          const one = yield* startSettlement();
          const two = yield* startSettlement();
          yield* settlementActionResult({ kind: "save", id: one, setup });
          yield* settlementActionResult({ kind: "save", id: two, setup });
          const prepared = yield* settlementActionResult({ kind: "prepare", id: one });
          const other = yield* settlementActionResult({ kind: "prepare", id: two });
          expect(prepared.pot?.execution?.walletFingerprint).toBe(`wallet-${one}`);
          expect(other.pot?.execution?.walletFingerprint).toBe(`wallet-${two}`);
          yield* settlementActionResult({ kind: "prepare", id: one });
          expect(controls.calls()).toBe(2);
          expect((yield* settlementActionResult({ kind: "pay", id: one })).ok).toBe(false);
          const wallet = controls.wallets.get(one);
          const payer = prepared.pot?.execution?.participants.find((participant): boolean => participant.payInSat > 0);
          if (wallet === undefined || payer === undefined) {
            yield* new PotError({ message: "Test wallet/payer missing" });
            return;
          }
          wallet.receive(payer.depositAddress, payer.payInSat);
          const settled = yield* settlementActionResult({ kind: "pay", id: one });
          expect(settled.pot?.status).toBe("settled");
          expect(wallet.sends()).toBe(1);
          yield* settlementActionResult({ kind: "pay", id: one });
          expect(wallet.sends()).toBe(1);
          expect((yield* loadSettlement(two)).status).toBe("unsettled");
          expect((yield* listSettlements()).map((pot) => [pot.id, pot.status])).toStrictEqual([
            [two, "unsettled"],
            [one, "settled"],
          ]);
        }),
      ),
  );

  it.effect("rejects unknown pots and unprepared payouts before touching a wallet", (): Effect.Effect<void, unknown> =>
    withFixture(() =>
      Effect.gen(function* test() {
        const controls = yield* TestWallets;
        const id = yield* startSettlement();
        expect((yield* settlementActionResult({ kind: "prepare", id: 999 })).ok).toBe(false);
        expect((yield* settlementActionResult({ kind: "prepare", id })).ok).toBe(false);
        yield* settlementActionResult({ kind: "save", id, setup });
        expect((yield* settlementActionResult({ kind: "pay", id })).ok).toBe(false);
        expect(controls.calls()).toBe(0);
      }),
    ),
  );
});
