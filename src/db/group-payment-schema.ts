import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { groups, participants } from "./group-schema";

export const participantPayments = sqliteTable("participant_payments", {
  participantId: text("participant_id")
    .primaryKey()
    .references(() => participants.id, { onDelete: "cascade" }),
  accessTokenHash: text("access_token_hash").notNull().unique(),
  arkAddress: text("ark_address"),
});

// A durable intent exists before any wallet operation. Its immutable setup is also the recovery checkpoint.
export const groupSettlements = sqliteTable("group_settlements", {
  groupId: text("group_id")
    .primaryKey()
    .references(() => groups.id, { onDelete: "cascade" }),
  snapshot: text("snapshot").notNull(),
  walletFingerprint: text("wallet_fingerprint").unique(),
});
