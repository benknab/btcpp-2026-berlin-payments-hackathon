import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export { groups, participants } from "./group-schema";
export { eventSettlements } from "./event-settlement-schema";
export { eventInvoices, eventPayouts } from "./event-payment-schema";
export { expenses, expenseShares } from "./expense-schema";
// Retain legacy table definitions for migration stability and recovery; no application actions use them.
export { settlementPots, settlementUsers, settlementDebts } from "./settlement-schema";

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  body: text("body").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type Note = typeof notes.$inferSelect;

// Historical server-owned pot bookkeeping remains intact alongside any archived wallet directories.
export const pots = sqliteTable("pots", {
  id: text("id").primaryKey(),
  walletFingerprint: text("wallet_fingerprint").notNull().unique(),
  revision: integer("revision").notNull(),
  snapshot: text("snapshot").notNull(),
});
