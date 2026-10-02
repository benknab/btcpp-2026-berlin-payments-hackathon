import { Database } from "@/db/database";
import { PotError } from "@/lib/pot";
import type { BarkMovement, BarkOperations } from "@/server/bark/service";
import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Context, Effect, Layer } from "effect";

import { PotStoreLive } from "./store";
import type { PotStore } from "./store";
import { PotWallet } from "./wallet";

interface WalletFixture {
  readonly bark: BarkOperations;
  readonly receive: (address: string, amountSat: number) => void;
  readonly sends: () => number;
}

function makeWallet(id: number): WalletFixture {
  const history: BarkMovement[] = [];
  let balance = 0;
  let addressIndex = 0;
  let sends = 0;
  return {
    bark: {
      address: (): Effect.Effect<string> =>
        Effect.sync((): string => {
          addressIndex += 1;
          return `tark1ace${String(addressIndex).replaceAll("1", "q")}`;
        }),
      fingerprint: (): Effect.Effect<string> => Effect.succeed(`wallet-${id}`),
      balance: (): Effect.Effect<number> => Effect.sync((): number => balance),
      history: (): Effect.Effect<readonly BarkMovement[]> => Effect.sync((): readonly BarkMovement[] => history),
      sync: (): Effect.Effect<void> => Effect.void,
      ready: (): Effect.Effect<void> => Effect.void,
      createSignetWallet: (): Effect.Effect<void> => Effect.void,
      send: (address, amountSat): Effect.Effect<void> =>
        Effect.sync((): void => {
          sends += 1;
          balance -= amountSat;
          history.push({
            id: history.length + 1,
            status: "successful",
            receivedOn: [],
            sentTo: [{ amountSat, destination: { type: "ark", value: address } }],
          });
        }),
    },
    receive: (address, amountSat): void => {
      balance += amountSat;
      history.push({
        id: history.length + 1,
        status: "successful",
        sentTo: [],
        receivedOn: [{ amountSat, destination: { type: "ark", value: address } }],
      });
    },
    sends: (): number => sends,
  };
}

interface WalletControls {
  readonly wallets: Readonly<ReadonlyMap<number, WalletFixture>>;
  readonly open: (id: number) => Effect.Effect<BarkOperations, PotError>;
  readonly calls: () => number;
  readonly fail: () => void;
}
export class TestWallets extends Context.Service<TestWallets, WalletControls>()("test/SettlementWallets") {}

function makeWallets(): WalletControls {
  const wallets = new Map<number, WalletFixture>();
  let calls = 0;
  let failed = false;
  return {
    wallets,
    open: (id) =>
      Effect.gen(function* open() {
        calls += 1;
        if (failed) {
          return yield* new PotError({
            message: "Payments are unavailable on this server. Your pot details are saved",
          });
        }
        const wallet = wallets.get(id) ?? makeWallet(id);
        wallets.set(id, wallet);
        return wallet.bark;
      }),
    calls: (): number => calls,
    fail: (): void => {
      failed = true;
    },
  };
}

export function withFixture(
  test: () => Effect.Effect<void, unknown, Database | PotStore | PotWallet | TestWallets>,
): Effect.Effect<void, unknown> {
  const database = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));
  const controls = Layer.sync(TestWallets, makeWallets);
  const wallets = Layer.effect(
    PotWallet,
    Effect.gen(function* walletLayer() {
      const value = yield* TestWallets;
      return {
        open: (id: number | string): Effect.Effect<BarkOperations, PotError> =>
          typeof id === "number"
            ? value.open(id)
            : Effect.fail(new PotError({ message: "Standalone pots require a numeric ID" })),
      };
    }),
  ).pipe(Layer.provide(controls));
  const store = PotStoreLive.pipe(Layer.provide(database));
  const services = Layer.mergeAll(database, controls, wallets, store);
  return Effect.gen(function* fixture() {
    yield* migrate(yield* Database, { migrationsFolder: "./drizzle" });
    yield* test();
  }).pipe(Effect.provide(services));
}
