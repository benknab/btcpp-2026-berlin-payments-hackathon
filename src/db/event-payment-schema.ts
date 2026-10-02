import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

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
