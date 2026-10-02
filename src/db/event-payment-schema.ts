import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";

import { groups, participants } from "./group-schema";

export const eventInvoices = sqliteTable(
  "event_invoices",
  {
    paymentHash: text("payment_hash").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id),
    invoice: text("invoice").notNull(),
    purpose: text("purpose", { enum: ["contribution", "fee-reserve"] })
      .notNull()
      .default("contribution"),
    amountSats: integer("amount_sats").notNull(),
    expiresAt: integer("expires_at").notNull(),
    status: text("status", { enum: ["pending", "paid", "delivered", "expired"] })
      .notNull()
      .default("pending"),
    deliveredSats: integer("delivered_sats").notNull().default(0),
  },
  () => [index("event_invoice_group").on(sql`"group_id"`)],
);
export type EventInvoice = typeof eventInvoices.$inferSelect;

export const eventPayouts = sqliteTable(
  "event_payouts",
  {
    // Legacy coordination key: a BOLT11 hash, or a random intent ID for Ark/BOLT12.
    paymentHash: text("payment_hash").primaryKey(),
    method: text("method", { enum: ["bolt11", "ark", "bolt12"] })
      .notNull()
      .default("bolt11"),
    historyStartId: integer("history_start_id"),
    movementId: integer("movement_id"),
    proofPaymentHash: text("proof_payment_hash"),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id),
    invoice: text("invoice").notNull(),
    amountSats: integer("amount_sats").notNull(),
    expiresAt: integer("expires_at").notNull(),
    status: text("status", { enum: ["prepared", "sending", "paid", "expired"] })
      .notNull()
      .default("prepared"),
  },
  () => [
    uniqueIndex("event_payout_movement").on(sql`"group_id"`, sql`"movement_id"`),
    uniqueIndex("event_payout_proof").on(sql`"proof_payment_hash"`),
    uniqueIndex("event_active_payout")
      .on(sql`"group_id"`, sql`"participant_id"`)
      .where(sql`"status" <> 'expired'`),
  ],
);
export type EventPayout = typeof eventPayouts.$inferSelect;
