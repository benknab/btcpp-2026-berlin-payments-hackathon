import { Database } from "@/db/database";
import { groupSettlements, pots } from "@/db/schema";
import { PotSchema, PotError } from "@/lib/pot";
import type { Pot } from "@/lib/pot";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";

export interface PotStorage {
  readonly insert: (pot: Pot) => Effect.Effect<Pot, PotError>;
  readonly get: (id: string) => Effect.Effect<Pot, PotError>;
  readonly findByWallet: (fingerprint: string) => Effect.Effect<Pot | null, PotError>;
  readonly save: (pot: Pot) => Effect.Effect<Pot, PotError>;
}

export class PotStore extends Context.Service<PotStore, PotStorage>()("payments/PotStore") {}

function decode(value: string): Effect.Effect<Pot, PotError> {
  return Schema.decodeUnknownEffect(Schema.fromJsonString(PotSchema))(value).pipe(
    Effect.mapError((): PotError => new PotError({ message: "Unreadable pot snapshot" })),
  );
}

const savePot = Effect.fn("savePotSnapshot")(function* savePot(pot: Pot) {
  const database = yield* Database;
  const next = { ...pot, revision: pot.revision + 1 };
  return yield* database
    .update(pots)
    .set({ revision: next.revision, snapshot: JSON.stringify(next) })
    .where(and(eq(pots.id, pot.id), eq(pots.revision, pot.revision)))
    .returning({ id: pots.id })
    .pipe(
      Effect.mapError((): PotError => new PotError({ message: "Could not persist pot" })),
      Effect.flatMap((rows: readonly { readonly id: string }[]) =>
        rows.length === 1
          ? Effect.succeed(next)
          : Effect.fail(new PotError({ message: "Pot changed concurrently; reload before continuing" })),
      ),
    );
});

const insertPot = Effect.fn("insertPotSnapshot")(function* insertPot(pot: Pot) {
  const database = yield* Database;
  return yield* database
    .transaction(() =>
      Effect.gen(function* reserveAndInsert() {
        const [reservation] = yield* database
          .select({ groupId: groupSettlements.groupId })
          .from(groupSettlements)
          .where(eq(groupSettlements.walletFingerprint, pot.walletFingerprint));
        if (reservation !== undefined && reservation.groupId !== pot.id) {
          return yield* new PotError({ message: "This wallet is reserved for a different group." });
        }
        yield* database.insert(pots).values({
          id: pot.id,
          walletFingerprint: pot.walletFingerprint,
          revision: pot.revision,
          snapshot: JSON.stringify(pot),
        });
        return pot;
      }),
    )
    .pipe(
      Effect.mapError(
        (): PotError => new PotError({ message: "Pot ID or wallet already used, or database unavailable" }),
      ),
    );
});

export const PotStoreLive = Layer.effect(
  PotStore,
  Effect.gen(function* makeStore() {
    const database = yield* Database;
    return {
      insert: (pot): Effect.Effect<Pot, PotError> => insertPot(pot).pipe(Effect.provideService(Database, database)),
      get: (id): Effect.Effect<Pot, PotError> =>
        database
          .select()
          .from(pots)
          .where(eq(pots.id, id))
          .pipe(
            Effect.flatMap((rows: readonly { readonly snapshot: string }[]) =>
              rows[0] === undefined
                ? Effect.fail(new PotError({ message: "Pot not found" }))
                : decode(rows[0].snapshot),
            ),
            Effect.mapError((): PotError => new PotError({ message: "Pot not found or unreadable" })),
          ),
      findByWallet: (fingerprint): Effect.Effect<Pot | null, PotError> =>
        database
          .select()
          .from(pots)
          .where(eq(pots.walletFingerprint, fingerprint))
          .pipe(
            Effect.mapError((): PotError => new PotError({ message: "Could not load this wallet's pot" })),
            Effect.flatMap((rows: readonly { readonly snapshot: string }[]) =>
              rows[0] === undefined ? Effect.succeed(null) : decode(rows[0].snapshot),
            ),
          ),
      save: (pot): Effect.Effect<Pot, PotError> => savePot(pot).pipe(Effect.provideService(Database, database)),
    };
  }),
);
