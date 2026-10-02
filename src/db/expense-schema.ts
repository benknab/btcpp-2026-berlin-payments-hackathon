import type { ExpenseSplit } from "@/domain/expense-split";
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { groups, participants } from "./group-schema";

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    payerId: text("payer_id")
      .notNull()
      .references(() => participants.id),
    description: text("description").notNull(),
    amountSats: integer("amount_sats").notNull(),
    date: text("date").notNull(),
    split: text("split", { mode: "json" }).$type<ExpenseSplit>(),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  () => [
    index("expenses_group").on(sql`"group_id"`),
    check("expense_positive_amount", sql`"amount_sats" > 0 AND "amount_sats" <= 2100000000000000`),
  ],
);

export const expenseShares = sqliteTable(
  "expense_shares",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id),
    amountSats: integer("amount_sats").notNull(),
  },
  () => [
    uniqueIndex("expense_participant_share").on(sql`"expense_id"`, sql`"participant_id"`),
    check("share_nonnegative_amount", sql`"amount_sats" >= 0 AND "amount_sats" <= 2100000000000000`),
  ],
);

export type Expense = typeof expenses.$inferSelect;
