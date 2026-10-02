import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const groups = sqliteTable(
  "groups",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    arkAddress: text("ark_address"),
    inviteTokenHash: text("invite_token_hash").notNull().unique(),
    organizerTokenHash: text("organizer_token_hash").notNull(),
    status: text("status", { enum: ["open", "settling", "settled"] })
      .notNull()
      .default("open"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  () => [check("groups_status", sql`"status" IN ('open', 'settling', 'settled')`)],
);

export const participants = sqliteTable(
  "participants",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    lnurl: text("lnurl"),
    position: integer("position").notNull(),
  },
  () => [uniqueIndex("participant_group_name").on(sql`"group_id"`, sql`"name_key"`)],
);

export type Group = typeof groups.$inferSelect;
export type Participant = typeof participants.$inferSelect;
