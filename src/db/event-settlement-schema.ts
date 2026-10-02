import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { groups } from "./group-schema";

export const eventSettlements = sqliteTable("event_settlements", {
  groupId: text("group_id")
    .primaryKey()
    .references(() => groups.id, { onDelete: "cascade" }),
  members: text("members").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
