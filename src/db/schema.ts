import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export { groups, participants } from "./group-schema";
export { expenses, expenseShares } from "./expense-schema";
export { settlementPots, settlementUsers, settlementDebts } from "./settlement-schema";

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  body: text("body").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type Note = typeof notes.$inferSelect;

export const pots = sqliteTable("pots", {
  id: text("id").primaryKey(),
  walletFingerprint: text("wallet_fingerprint").notNull().unique(),
  revision: integer("revision").notNull(),
  snapshot: text("snapshot").notNull(),
});
