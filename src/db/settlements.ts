import { PotError, PotSchema, calculateObligations } from "@/lib/pot";
import { SettlementId, SettlementSetup, settlementPaymentId } from "@/lib/settlement";
import type { SettlementDocument, SettlementSetupInput, SettlementSummary } from "@/lib/settlement";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { Database } from "./database";
import { pots } from "./schema";
import { settlementDebts, settlementPots, settlementUsers } from "./settlement-schema";

const summaryRows = Effect.fn("settlementSummaryRows")(function* summaryRows() {
  const database = yield* Database;
  return yield* database
    .select({
      id: settlementPots.id,
      locked: settlementPots.locked,
      createdAt: settlementPots.createdAt,
      snapshot: pots.snapshot,
    })
    .from(settlementPots)
    .leftJoin(pots, eq(pots.id, sql<string>`'settlement-' || ${settlementPots.id}`))
    .orderBy(desc(settlementPots.id));
});

export const listSettlements = Effect.fn("listSettlements")(function* listSettlements() {
  const rows = yield* summaryRows();
  return yield* Effect.forEach(
    rows,
    (row) =>
      Effect.gen(function* summary() {
        const execution =
          row.snapshot === null
            ? null
            : yield* Schema.decodeUnknownEffect(Schema.fromJsonString(PotSchema))(row.snapshot);
        const item: SettlementSummary = {
          id: row.id,
          locked: row.locked,
          createdAt: row.createdAt,
          status: execution?.status === "settled" ? "settled" : "unsettled",
        };
        return item;
      }),
    { concurrency: 1 },
  );
});

export const loadSettlement = Effect.fn("loadSettlement")(function* loadSettlement(id: number) {
  yield* Schema.decodeUnknownEffect(SettlementId)(id);
  const database = yield* Database;
  const rows = yield* database.select().from(settlementPots).where(eq(settlementPots.id, id));
  const [row] = rows;
  if (row === undefined) {
    return yield* new PotError({ message: "Pot not found" });
  }
  const users = yield* database
    .select()
    .from(settlementUsers)
    .where(eq(settlementUsers.potId, id))
    .orderBy(asc(settlementUsers.id));
  const debts = yield* database
    .select()
    .from(settlementDebts)
    .where(eq(settlementDebts.potId, id))
    .orderBy(asc(settlementDebts.id));
  const snapshots = yield* database
    .select({ snapshot: pots.snapshot })
    .from(pots)
    .where(eq(pots.id, settlementPaymentId(id)));
  const [snapshot] = snapshots;
  const execution =
    snapshot === undefined
      ? null
      : yield* Schema.decodeUnknownEffect(Schema.fromJsonString(PotSchema))(snapshot.snapshot);
  return {
    ...row,
    users,
    debts,
    execution,
    status: execution?.status === "settled" ? "settled" : "unsettled",
  } satisfies SettlementDocument;
});

export const startSettlement = Effect.fn("startSettlement")(function* startSettlement() {
  const database = yield* Database;
  const rows = yield* database.insert(settlementPots).values({}).returning({ id: settlementPots.id });
  const [row] = rows;
  if (row === undefined) {
    return yield* new PotError({ message: "Could not create pot" });
  }
  return row.id;
});

const insertUsers = Effect.fn("insertSettlementUsers")(function* insertUsers(id: number, setup: SettlementSetupInput) {
  const database = yield* Database;
  const ids = new Map<string, number>();
  for (const user of setup.users) {
    const rows = yield* database
      .insert(settlementUsers)
      .values({ potId: id, name: user.name, arkAddress: user.arkAddress })
      .returning({ id: settlementUsers.id });
    const [row] = rows;
    if (row === undefined) {
      return yield* new PotError({ message: "Could not save participant" });
    }
    ids.set(user.id, row.id);
  }
  return ids;
});

const insertDebts = Effect.fn("insertSettlementDebts")(function* insertDebts(
  id: number,
  setup: SettlementSetupInput,
  userIds: Readonly<ReadonlyMap<string, number>>,
) {
  const database = yield* Database;
  const rows = [];
  for (const debt of setup.debts) {
    const fromUserId = userIds.get(debt.from);
    const toUserId = userIds.get(debt.to);
    if (fromUserId === undefined || toUserId === undefined) {
      yield* new PotError({ message: "Debts must reference this pot's participants" });
      return;
    }
    rows.push({ potId: id, fromUserId, toUserId, amountSat: debt.amountSat });
  }
  yield* database.insert(settlementDebts).values(rows);
});

export const saveSettlement = Effect.fn("saveSettlement")(function* saveSettlement(
  id: number,
  value: SettlementSetupInput,
) {
  yield* Schema.decodeUnknownEffect(SettlementId)(id);
  const setup = yield* Schema.decodeUnknownEffect(SettlementSetup)(value);
  yield* calculateObligations({ ...setup, id: settlementPaymentId(id) });
  const database = yield* Database;
  yield* database.transaction(() =>
    Effect.gen(function* saveDetails() {
      const locked = yield* database
        .update(settlementPots)
        .set({ locked: true })
        .where(and(eq(settlementPots.id, id), eq(settlementPots.locked, false)))
        .returning({ id: settlementPots.id });
      if (locked.length !== 1) {
        yield* new PotError({ message: "Pot not found or its details are already locked" });
        return;
      }
      yield* insertDebts(id, setup, yield* insertUsers(id, setup));
    }),
  );
  return yield* loadSettlement(id);
});
