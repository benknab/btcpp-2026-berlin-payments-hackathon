import { Database } from "@/db/database";
import { PotError } from "@/lib/pot";
import type { Pot, PotInput } from "@/lib/pot";
import { Bark, BarkError } from "@/server/bark/service";
import type { BarkMovement, BarkOperations } from "@/server/bark/service";
import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { describe, expect, it } from "@effect/vitest";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Context, Effect, Layer } from "effect";
import type { Schema } from "effect";

import { confirmPot, createPot, settlePot } from "./service";
import { PotStore, PotStoreLive } from "./store";

type TestError = PotError | BarkError | Schema.SchemaError;
type SendMode = "ok" | "lost-response" | "failed" | "pending" | "unrecorded";
const input = {
  id: "dinner",
  users: [
    { id: "alice", name: "Alice", arkAddress: "tark1ace" },
    { id: "bob", name: "Bob", arkAddress: "tark1q0q" },
    { id: "carol", name: "Carol", arkAddress: "tark1car0l" },
  ],
  debts: [
    { from: "alice", to: "bob", amountSat: 8000 },
    { from: "alice", to: "carol", amountSat: 1000 },
  ],
} satisfies PotInput;

interface Controls {
  readonly bark: BarkOperations;
  readonly receive: (address: string, amountSat: number, status?: BarkMovement["status"]) => void;
  readonly setBalance: (amountSat: number) => void;
  readonly setFingerprint: (fingerprint: string) => void;
  readonly setSendMode: (mode: SendMode) => void;
  readonly duplicateHistory: () => void;
  readonly sendCount: () => number;
}

class TestControls extends Context.Service<TestControls, Controls>()("test/PotControls") {}

function makeControls(): Controls {
  let history: BarkMovement[] = [];
  let balance = 0;
  let addressIndex = 0;
  let fingerprint = "test-wallet";
  let sendMode: SendMode = "ok";
  let sendCount = 0;
  let movementIndex = 0;
  return {
    bark: {
      address: (): Effect.Effect<string> =>
        Effect.sync((): string => {
          addressIndex += 1;
          return `tark1${String(addressIndex).replaceAll("1", "q")}`;
        }),
      balance: (): Effect.Effect<number> => Effect.sync((): number => balance),
      fingerprint: (): Effect.Effect<string> => Effect.sync((): string => fingerprint),
      history: (): Effect.Effect<readonly BarkMovement[]> => Effect.sync((): readonly BarkMovement[] => history),
      sync: (): Effect.Effect<void> => Effect.void,
      ready: (): Effect.Effect<void> => Effect.void,
      createSignetWallet: (): Effect.Effect<void> => Effect.void,
      send: (address, amountSat): Effect.Effect<void, BarkError> =>
        Effect.gen(function* send() {
          sendCount += 1;
          if (sendMode !== "unrecorded") {
            movementIndex += 1;
            history.push({
              id: movementIndex,
              status: sendStatus(sendMode),
              receivedOn: [],
              sentTo: [{ amountSat, destination: { type: "ark", value: address } }],
            });
            if (sendMode === "ok" || sendMode === "lost-response") {
              balance -= amountSat;
            }
          }
          if (sendMode !== "ok") {
            yield* new BarkError({ operation: "send", message: "Simulated ambiguous send" });
          }
        }),
    },
    receive: (address, amountSat, status = "successful"): void => {
      movementIndex += 1;
      history.push({
        id: movementIndex,
        status,
        sentTo: [],
        receivedOn: [{ amountSat, destination: { type: "ark", value: address } }],
      });
      if (status === "successful") {
        balance += amountSat;
      }
    },
    setBalance: (amountSat): void => {
      balance = amountSat;
    },
    setFingerprint: (value): void => {
      fingerprint = value;
    },
    setSendMode: (mode): void => {
      sendMode = mode;
    },
    duplicateHistory: (): void => {
      history = [...history, ...history];
    },
    sendCount: (): number => sendCount,
  };
}

function sendStatus(mode: SendMode): BarkMovement["status"] {
  if (mode === "failed") {
    return "failed";
  }
  if (mode === "pending") {
    return "pending";
  }
  return "successful";
}

function withFixture(
  test: () => Effect.Effect<void, TestError, Bark | PotStore | TestControls>,
): Effect.Effect<void, TestError> {
  const database = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));
  const controls = Layer.sync(TestControls, makeControls);
  const bark = Layer.effect(Bark, TestControls.pipe(Effect.map((value): BarkOperations => value.bark))).pipe(
    Layer.provide(controls),
  );
  const services = Layer.mergeAll(database, controls, bark, PotStoreLive.pipe(Layer.provide(database)));
  return Effect.gen(function* fixture() {
    yield* migrate(yield* Database, { migrationsFolder: "./drizzle" }).pipe(
      Effect.mapError((): PotError => new PotError({ message: "Test migration failed" })),
    );
    yield* test();
  }).pipe(Effect.provide(services));
}

function depositAll(pot: Pot, controls: Controls): void {
  for (const participant of pot.participants) {
    if (participant.payInSat > 0) {
      controls.receive(participant.depositAddress, participant.payInSat);
    }
  }
}

describe("durable Bark pot", (): void => {
  it.effect(
    "assigns all addresses, validates deposits, pays exact amounts, and settles idempotently",
    (): Effect.Effect<void, TestError> =>
      withFixture(() =>
        Effect.gen(function* test() {
          const controls = yield* TestControls;
          const pot = yield* createPot(input);
          expect(new Set(pot.participants.map((participant): string => participant.depositAddress)).size).toBe(3);
          expect(pot.totalSat).toBe(9000);
          depositAll(pot, controls);
          const confirmed = yield* confirmPot(pot.id);
          expect(confirmed.participants[0]?.receivedSat).toBe(9000);
          const settled = yield* settlePot(pot.id);
          expect(settled.status).toBe("settled");
          expect(
            settled.participants
              .filter((participant): boolean => participant.receiveSat > 0)
              .every((participant): boolean => participant.payoutStatus === "paid"),
          ).toBe(true);
          expect(controls.sendCount()).toBe(2);
          expect(yield* settlePot(pot.id)).toStrictEqual(settled);
          expect(controls.sendCount()).toBe(2);
        }),
      ),
  );

  it.effect(
    "ignores unrelated funds and pending/failed receipts; handles partial deposits without double counting",
    (): Effect.Effect<void, TestError> =>
      withFixture(() =>
        Effect.gen(function* test() {
          const controls = yield* TestControls;
          const pot = yield* createPot(input);
          const [payer] = pot.participants;
          expect(payer).toBeDefined();
          if (payer === undefined) {
            return;
          }
          controls.receive("tark1unrelated", 100_000);
          controls.receive(payer.depositAddress, 9000, "pending");
          controls.receive(payer.depositAddress, 9000, "failed");
          controls.receive(payer.depositAddress, 3000);
          controls.duplicateHistory();
          const first = yield* confirmPot(pot.id);
          const second = yield* confirmPot(pot.id);
          expect(first.participants[0]?.receivedSat).toBe(3000);
          expect(second.participants[0]?.receivedSat).toBe(3000);
          expect(yield* Effect.result(settlePot(pot.id))).toMatchObject({ _tag: "Failure" });
          expect(controls.sendCount()).toBe(0);
          controls.receive(payer.depositAddress, 6000);
          expect((yield* settlePot(pot.id)).status).toBe("settled");
        }),
      ),
  );

  it.effect(
    "one participant's overpayment cannot cover another participant's missing contribution",
    (): Effect.Effect<void, TestError> =>
      withFixture(() =>
        Effect.gen(function* test() {
          const controls = yield* TestControls;
          const pot = yield* createPot({
            ...input,
            debts: [
              { from: "alice", to: "bob", amountSat: 5000 },
              { from: "carol", to: "bob", amountSat: 4000 },
            ],
          });
          const [alice] = pot.participants;
          if (alice === undefined) {
            return;
          }
          controls.receive(alice.depositAddress, 9000);
          expect(yield* Effect.result(settlePot(pot.id))).toMatchObject({ _tag: "Failure" });
          expect(controls.sendCount()).toBe(0);
        }),
      ),
  );

  it.effect("stops before spending when available pot funds are insufficient", (): Effect.Effect<void, TestError> =>
    withFixture(() =>
      Effect.gen(function* test() {
        const controls = yield* TestControls;
        const pot = yield* createPot(input);
        depositAll(pot, controls);
        controls.setBalance(8999);
        expect(yield* Effect.result(settlePot(pot.id))).toMatchObject({ _tag: "Failure" });
        expect(controls.sendCount()).toBe(0);
      }),
    ),
  );

  it.effect(
    "reconciles a successful send with a lost response without paying twice",
    (): Effect.Effect<void, TestError> =>
      withFixture(() =>
        Effect.gen(function* test() {
          const controls = yield* TestControls;
          const pot = yield* createPot(input);
          depositAll(pot, controls);
          controls.setSendMode("lost-response");
          expect(yield* Effect.result(settlePot(pot.id))).toMatchObject({ _tag: "Failure" });
          expect(controls.sendCount()).toBe(1);
          controls.setSendMode("ok");
          const settled = yield* settlePot(pot.id);
          expect(settled.status).toBe("settled");
          expect(controls.sendCount()).toBe(2);
        }),
      ),
  );

  it.effect.each<SendMode>(["failed", "pending", "unrecorded"])(
    "never automatically retries an uncertain %s payout",
    (mode): Effect.Effect<void, TestError> =>
      withFixture(() =>
        Effect.gen(function* test() {
          const controls = yield* TestControls;
          const pot = yield* createPot(input);
          depositAll(pot, controls);
          controls.setSendMode(mode);
          expect(yield* Effect.result(settlePot(pot.id))).toMatchObject({ _tag: "Failure" });
          controls.setSendMode("ok");
          expect(yield* Effect.result(settlePot(pot.id))).toMatchObject({ _tag: "Failure" });
          expect(controls.sendCount()).toBe(1);
        }),
      ),
  );

  it.effect(
    "rejects a different wallet and prevents stale/concurrent snapshot writes",
    (): Effect.Effect<void, TestError> =>
      withFixture(() =>
        Effect.gen(function* test() {
          const controls = yield* TestControls;
          const store = yield* PotStore;
          const pot = yield* createPot(input);
          yield* store.save(pot);
          expect(yield* Effect.result(store.save(pot))).toMatchObject({ _tag: "Failure" });
          expect(yield* Effect.result(createPot({ ...input, id: "other-pot" }))).toMatchObject({ _tag: "Failure" });
          controls.setFingerprint("wrong-wallet");
          expect(yield* Effect.result(settlePot(pot.id))).toMatchObject({ _tag: "Failure" });
          expect(controls.sendCount()).toBe(0);
        }),
      ),
  );

  it.effect("concurrent settlement callers cannot duplicate payouts", (): Effect.Effect<void, TestError> =>
    withFixture(() =>
      Effect.gen(function* test() {
        const controls = yield* TestControls;
        const pot = yield* createPot(input);
        depositAll(pot, controls);
        const results = yield* Effect.all([Effect.result(settlePot(pot.id)), Effect.result(settlePot(pot.id))], {
          concurrency: 2,
        });
        expect(results.some((result: Readonly<{ _tag: string }>): boolean => result._tag === "Success")).toBe(true);
        expect((yield* settlePot(pot.id)).status).toBe("settled");
        expect(controls.sendCount()).toBe(2);
      }),
    ),
  );
});
