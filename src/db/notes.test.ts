import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { Database } from "./database";
import { addNote, listNotes } from "./notes";

describe("effect + Drizzle + libSQL", (): void => {
  it("migrates SQLite and inserts and reads notes with native Effects", { timeout: 5000 }, async (): Promise<void> => {
    expect.hasAssertions();
    const TestDatabase = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));

    const result = await Effect.runPromise(
      Effect.gen(function* verifyNotes() {
        const database = yield* Database;
        yield* migrate(database, { migrationsFolder: "./drizzle" });
        const empty = yield* listNotes();
        yield* addNote({ body: "First note" });
        yield* addNote({ body: "Second note" });
        const saved = yield* listNotes();
        return { empty, saved };
      }).pipe(Effect.provide(TestDatabase)),
    );

    expect(result.empty).toStrictEqual([]);
    expect(result.saved.map((note): string => note.body)).toStrictEqual(["Second note", "First note"]);
    expect(result.saved).toHaveLength(2);
    expect(result.saved[0]?.createdAt).toStrictEqual(expect.any(String));
  });
});
