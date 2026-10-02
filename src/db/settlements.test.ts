import type { SettlementSetupInput } from "@/lib/settlement";
import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { describe, expect, it } from "@effect/vitest";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer } from "effect";

import { Database } from "./database";
import { listSettlements, loadSettlement, saveSettlement, startSettlement } from "./settlements";

const setup: SettlementSetupInput = {
  users: [
    { id: "alice", name: "Alice", arkAddress: "ark1ace" },
    { id: "bob", name: "Bob", arkAddress: "ark1q0q" },
  ],
  debts: [{ from: "alice", to: "bob", amountSat: 9000 }],
};

function withDatabase(test: () => Effect.Effect<void, unknown, Database>): Effect.Effect<void, unknown> {
  const database = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));
  return Effect.gen(function* fixture() {
    yield* migrate(yield* Database, { migrationsFolder: "./drizzle" });
    yield* test();
  }).pipe(Effect.provide(database));
}

describe("SQLite settlement pots", (): void => {
  it.effect(
    "uses incrementing pot, user, and debt IDs and reloads each pot independently",
    (): Effect.Effect<void, unknown> =>
      withDatabase(() =>
        Effect.gen(function* test() {
          expect(yield* listSettlements()).toStrictEqual([]);
          const first = yield* startSettlement();
          const second = yield* startSettlement();
          expect([first, second]).toStrictEqual([1, 2]);
          const one = yield* saveSettlement(first, setup);
          const two = yield* saveSettlement(second, {
            ...setup,
            debts: [{ from: "bob", to: "alice", amountSat: 1000 }],
          });
          expect(one.users.map((user) => user.id)).toStrictEqual([1, 2]);
          expect(two.users.map((user) => user.id)).toStrictEqual([3, 4]);
          expect(one.debts).toMatchObject([{ id: 1, fromUserId: 1, toUserId: 2, amountSat: 9000 }]);
          expect(two.debts).toMatchObject([{ id: 2, fromUserId: 4, toUserId: 3, amountSat: 1000 }]);
          expect(yield* loadSettlement(first)).toStrictEqual(one);
          expect(yield* loadSettlement(second)).toStrictEqual(two);
          expect((yield* listSettlements()).map((pot) => [pot.id, pot.status])).toStrictEqual([
            [2, "unsettled"],
            [1, "unsettled"],
          ]);
          expect(one.execution).toBeNull();
        }),
      ),
  );

  it.effect(
    "rejects foreign participants and self-debts without persisting partial setup",
    (): Effect.Effect<void, unknown> =>
      withDatabase(() =>
        Effect.gen(function* test() {
          const id = yield* startSettlement();
          const foreign = yield* Effect.result(
            saveSettlement(id, { ...setup, debts: [{ from: "other-pot-user", to: "bob", amountSat: 100 }] }),
          );
          const self = yield* Effect.result(
            saveSettlement(id, { ...setup, debts: [{ from: "alice", to: "alice", amountSat: 100 }] }),
          );
          expect(foreign._tag).toBe("Failure");
          expect(self._tag).toBe("Failure");
          const pot = yield* loadSettlement(id);
          expect(pot.locked).toBe(false);
          expect(pot.users).toStrictEqual([]);
          expect(pot.debts).toStrictEqual([]);
        }),
      ),
  );

  it.effect("does not overwrite locked details or accept missing/invalid pot IDs", (): Effect.Effect<void, unknown> =>
    withDatabase(() =>
      Effect.gen(function* test() {
        const id = yield* startSettlement();
        const saved = yield* saveSettlement(id, setup);
        expect(
          (yield* Effect.result(saveSettlement(id, { ...setup, debts: [{ from: "alice", to: "bob", amountSat: 1 }] })))
            ._tag,
        ).toBe("Failure");
        expect(yield* loadSettlement(id)).toStrictEqual(saved);
        expect((yield* Effect.result(loadSettlement(999)))._tag).toBe("Failure");
        expect((yield* Effect.result(loadSettlement(0)))._tag).toBe("Failure");
      }),
    ),
  );
});
