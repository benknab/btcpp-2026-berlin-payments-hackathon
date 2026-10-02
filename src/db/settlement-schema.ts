import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settlementPots = sqliteTable("settlement_pots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const settlementUsers = sqliteTable(
  "settlement_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    potId: integer("pot_id")
      .notNull()
      .references(() => settlementPots.id),
    name: text("name").notNull(),
    arkAddress: text("ark_address").notNull(),
  },
  () => [index("settlement_users_pot_idx").on(sql`"pot_id"`)],
);

export const settlementDebts = sqliteTable(
  "settlement_debts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    potId: integer("pot_id")
      .notNull()
      .references(() => settlementPots.id),
    fromUserId: integer("from_user_id")
      .notNull()
      .references(() => settlementUsers.id),
    toUserId: integer("to_user_id")
      .notNull()
      .references(() => settlementUsers.id),
    amountSat: integer("amount_sat").notNull(),
  },
  () => [index("settlement_debts_pot_idx").on(sql`"pot_id"`)],
);
