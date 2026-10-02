import { CreateDemoEvent, DEMO_PEOPLE, DEMO_PRESETS, demoTotal, MAX_DEMO_TOTAL_SATS } from "@/domain/demo-presets";
import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { describe, expect, it } from "@effect/vitest";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer, Schema } from "effect";

import { Database } from "./database";
import { createDemoEvent } from "./demo-events";
import { editExpense, listExpenses } from "./expenses";
import { getGroup } from "./groups";
import { groups, participants, expenses, expenseShares, eventInvoices, eventPayouts } from "./schema";

const TestDatabase = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));
const input = {
  presetId: "coffee",
  requestKey: "a".repeat(64),
  arkAddress: "ark1ace",
} satisfies typeof CreateDemoEvent.Type;

describe("demo event presets", () => {
  it.effect.each(DEMO_PRESETS)("seeds $name with the supplied destinations and real editable expenses", (preset) =>
    Effect.gen(function* verifyPreset() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const created = yield* createDemoEvent({ ...input, presetId: preset.id });
      const view = yield* getGroup(created.inviteKey, created.organizerToken);
      const entries = yield* listExpenses(created.inviteKey);
      const total = entries.reduce((sum, expense) => sum + expense.amountSats, 0);
      expect(view.group.name).toBe(preset.name);
      expect(view.group.status).toBe("open");
      expect(view.group.arkAddress).toBe(input.arkAddress);
      expect(view.isOrganizer).toBe(true);
      expect(view.participants.map(({ name, lnurl }) => ({ name, address: lnurl }))).toStrictEqual(DEMO_PEOPLE);
      expect(view.participants.find((person) => person.id === created.organizerId)?.name).toBe("Vini");
      expect(total).toBe(demoTotal(preset));
      expect(total).toBeLessThanOrEqual(MAX_DEMO_TOTAL_SATS);
      expect(entries).toHaveLength(preset.expenses.length);
      for (const seeded of entries) {
        const payer = view.participants.find((person) => person.id === seeded.payerId)?.name;
        expect(preset.expenses).toContainEqual({
          payer,
          description: seeded.description,
          amountSats: seeded.amountSats,
        });
        expect(seeded.shares).toHaveLength(DEMO_PEOPLE.length);
        expect(seeded.shares.reduce((sum, share) => sum + share.amountSats, 0)).toBe(seeded.amountSats);
      }
      expect(yield* database.select().from(eventInvoices)).toStrictEqual([]);
      expect(yield* database.select().from(eventPayouts)).toStrictEqual([]);
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect("keeps the combined preset expense totals within 1,000 sats", () =>
    Effect.sync(() => {
      expect(DEMO_PRESETS.reduce((total, preset) => total + demoTotal(preset), 0)).toBeLessThanOrEqual(
        MAX_DEMO_TOTAL_SATS,
      );
      expect(DEMO_PRESETS.map((preset) => demoTotal(preset))).toStrictEqual([200, 300, 500]);
    }),
  );

  it.effect("reuses the same event on retries and opening, preserving edits and settlement status", () =>
    Effect.gen(function* verifyRetry() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const created = yield* createDemoEvent(input);
      const originals = yield* listExpenses(created.inviteKey);
      expect(originals).toHaveLength(1);
      for (const original of originals) {
        yield* editExpense({
          inviteKey: created.inviteKey,
          expenseId: original.id,
          payerId: original.payerId,
          description: "Edited coffee",
          amountSats: 100,
          date: original.date,
          version: original.version,
        });
      }
      // This isolated in-memory database contains only the event created above.
      yield* database.update(groups).set({ status: "settling" });
      expect(yield* createDemoEvent(input)).toStrictEqual(created);
      expect(yield* createDemoEvent(input, true)).toStrictEqual(created);
      expect(yield* database.select().from(groups)).toHaveLength(1);
      expect(yield* database.select().from(participants)).toHaveLength(4);
      expect(yield* database.select().from(expenses)).toHaveLength(1);
      expect((yield* listExpenses(created.inviteKey))[0]?.description).toBe("Edited coffee");
      expect((yield* getGroup(created.inviteKey)).group.status).toBe("settling");
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect.each([{ presetId: "dinner" }, { arkAddress: "ark1xyz" }])("rejects conflicting retries %j", (replacement) =>
    Effect.gen(function* verifyConflict() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      yield* createDemoEvent(input);
      const conflict = { ...input, ...replacement };
      const valid = yield* Schema.decodeUnknownEffect(CreateDemoEvent)(conflict);
      expect((yield* Effect.flip(createDemoEvent(valid)))._tag).toBe("GroupError");
      expect(yield* database.select().from(groups)).toHaveLength(1);
      expect(yield* database.select().from(expenses)).toHaveLength(1);
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect("creates a fresh event and wallet address for a new run without altering earlier events", () =>
    Effect.gen(function* verifyFreshRun() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const first = yield* createDemoEvent(input);
      const second = yield* createDemoEvent({ ...input, requestKey: "b".repeat(64), arkAddress: "ark1xyz" });
      expect(first.inviteKey).not.toBe(second.inviteKey);
      expect((yield* getGroup(first.inviteKey)).group.arkAddress).toBe("ark1ace");
      expect((yield* getGroup(second.inviteKey)).group.arkAddress).toBe("ark1xyz");
      expect(yield* database.select().from(groups)).toHaveLength(2);
      expect(yield* database.select().from(expenses)).toHaveLength(2);
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect("does not recreate an unavailable saved event", () =>
    Effect.gen(function* verifyUnavailable() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      expect((yield* Effect.flip(createDemoEvent(input, true)))._tag).toBe("GroupError");
      expect(yield* database.select().from(groups)).toStrictEqual([]);
    }).pipe(Effect.provide(TestDatabase)),
  );

  it.effect("rolls back all seeded records together if the transaction fails", () =>
    Effect.gen(function* verifyAtomicity() {
      expect.hasAssertions();
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      yield* Effect.flip(
        database.transaction(() => createDemoEvent(input).pipe(Effect.andThen(Effect.fail("rollback")))),
      );
      expect(yield* database.select().from(groups)).toStrictEqual([]);
      expect(yield* database.select().from(participants)).toStrictEqual([]);
      expect(yield* database.select().from(expenses)).toStrictEqual([]);
      expect(yield* database.select().from(expenseShares)).toStrictEqual([]);
    }).pipe(Effect.provide(TestDatabase)),
  );
});
