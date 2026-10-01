import type { NewNote } from "@/lib/note-input";
import { desc } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import { Effect } from "effect";

import { Database } from "./database";
import { notes } from "./schema";
import type { Note } from "./schema";

const NOTE_LIST_LIMIT = 20;

export const listNotes = Effect.fn("listNotes")(function* listNotes(): Effect.fn.Return<
  readonly Note[],
  EffectDrizzleQueryError,
  Database
> {
  const database = yield* Database;
  return yield* database.select().from(notes).orderBy(desc(notes.id)).limit(NOTE_LIST_LIMIT);
});

export const addNote = Effect.fn("addNote")(function* addNote(
  input: typeof NewNote.Type,
): Effect.fn.Return<void, EffectDrizzleQueryError, Database> {
  const database = yield* Database;
  yield* database.insert(notes).values(input);
});
