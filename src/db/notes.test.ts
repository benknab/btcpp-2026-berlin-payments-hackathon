import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { describe, expect, it } from "@effect/vitest";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer } from "effect";

import { Database } from "./database";
import { addNote, listNotes } from "./notes";

describe("effect + Drizzle + libSQL", (): void => {
  const TestDatabase = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));

  it.effect(
    "migrates SQLite and inserts and reads notes with native Effects",
    (): Effect.Effect<void, Effect.Error<ReturnType<typeof migrate>>> =>
      Effect.gen(function* verifyNotes() {
        expect.hasAssertions();
        const database = yield* Database;
        yield* migrate(database, { migrationsFolder: "./drizzle" });
        const empty = yield* listNotes();
        yield* addNote({ body: "First note" });
        yield* addNote({ body: "Second note" });
        const saved = yield* listNotes();
        expect(empty).toStrictEqual([]);
        expect(saved.map((note): string => note.body)).toStrictEqual(["Second note", "First note"]);
        expect(saved).toHaveLength(2);
        expect(saved[0]?.createdAt).toStrictEqual(expect.any(String));
      }).pipe(Effect.provide(TestDatabase)),
    { timeout: 5000 },
  );
});
