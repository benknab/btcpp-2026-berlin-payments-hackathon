import { DatabaseLive } from "@/db/database";
import { addNote, listNotes } from "@/db/notes";
import type { Note } from "@/db/schema";
import { NewNote } from "@/lib/note-input";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

export const getNotes = createServerFn({ method: "GET" }).handler((): Promise<readonly Note[]> =>
  Effect.runPromise(listNotes().pipe(Effect.provide(DatabaseLive))),
);

export const createNote = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(NewNote))
  .handler(({ data }: Readonly<{ data: typeof NewNote.Type }>): Promise<void> =>
    Effect.runPromise(addNote(data).pipe(Effect.provide(DatabaseLive))),
  );
