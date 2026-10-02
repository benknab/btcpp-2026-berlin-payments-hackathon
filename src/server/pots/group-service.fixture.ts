import { Database } from "@/db/database";
import { addExpense } from "@/db/expenses";
import { createGroup, getGroup } from "@/db/groups";
import { issuePersonalLink, savePersonalAddress } from "@/db/participant-payments";
import { Bark, BarkError } from "@/server/bark/service";
import type { BarkMovement, BarkOperations } from "@/server/bark/service";
import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Context, Effect, Layer } from "effect";

import type { PotStore } from "./store";
import { PotStoreLive } from "./store";
import { PotWallet } from "./wallet";

interface Controls {
  readonly bark: BarkOperations;
  readonly receive: (address: string, amountSat: number, status?: BarkMovement["status"]) => void;
  readonly failAddress: (fail: boolean) => void;
  readonly loseSendResponse: () => void;
  readonly sends: () => number;
}
export class TestControls extends Context.Service<TestControls, Controls>()("test/GroupPayments") {}

function movement(
  index: number,
  input: {
    readonly address: string;
    readonly amountSat: number;
    readonly status: BarkMovement["status"];
    readonly incoming: boolean;
  },
): BarkMovement {
  const destination = { amountSat: input.amountSat, destination: { type: "ark", value: input.address } };
  return {
    id: index + 1,
    status: input.status,
    sentTo: input.incoming ? [] : [destination],
    receivedOn: input.incoming ? [destination] : [],
  };
}

function makeControls(): Controls {
  const history: BarkMovement[] = [];
  let addressIndex = 0;
  let balance = 0;
  let failAddress = false;
  let loseResponse = false;
  let sends = 0;
  return {
    bark: {
      address: () =>
        failAddress
          ? Effect.fail(new BarkError({ operation: "address", message: "Offline" }))
          : Effect.sync(() => {
              addressIndex += 1;
              return `ark1q${"q".repeat(addressIndex)}`;
            }),
      fingerprint: () => Effect.succeed("isolated-test-wallet"),
      balance: () => Effect.sync(() => balance),
      sync: () => Effect.void,
      ready: () => Effect.void,
      createMainnetWallet: () => Effect.void,
      history: () => Effect.sync(() => history),
      send: (address, amountSat) =>
        Effect.gen(function* send() {
          sends += 1;
          balance -= amountSat;
          history.push(movement(history.length, { address, amountSat, status: "successful", incoming: false }));
          if (loseResponse) {
            loseResponse = false;
            yield* new BarkError({ operation: "send", message: "Response lost after send" });
          }
        }),
    },
    receive: (address, amountSat, status = "successful") => {
      history.push(movement(history.length, { address, amountSat, status, incoming: true }));
      if (status === "successful") {
        balance += amountSat;
      }
    },
    failAddress: (fail) => {
      failAddress = fail;
    },
    loseSendResponse: () => {
      loseResponse = true;
    },
    sends: () => sends,
  };
}

export function fixture(
  test: () => Effect.Effect<void, unknown, Database | Bark | PotStore | PotWallet | TestControls>,
): Effect.Effect<void, unknown> {
  const database = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: "file::memory:" })));
  const controls = Layer.sync(TestControls, makeControls);
  const bark = Layer.effect(Bark, TestControls.pipe(Effect.map((value) => value.bark))).pipe(Layer.provide(controls));
  const wallets = Layer.effect(
    PotWallet,
    TestControls.pipe(
      Effect.map((value) => ({ open: (): Effect.Effect<BarkOperations> => Effect.succeed(value.bark) })),
    ),
  ).pipe(Layer.provide(controls));
  const store = PotStoreLive.pipe(Layer.provide(database));
  return Effect.gen(function* run() {
    yield* migrate(yield* Database, { migrationsFolder: "./drizzle" });
    yield* test();
  }).pipe(Effect.provide(Layer.mergeAll(database, controls, bark, wallets, store)));
}

const prepareLinks = Effect.fn("prepareGroupLinks")(function* prepareLinks(
  group: Readonly<Effect.Success<ReturnType<typeof createGroup>>>,
) {
  const view = yield* getGroup(group.inviteKey);
  const links: string[] = [];
  for (const [index, person] of view.participants.entries()) {
    const link = yield* issuePersonalLink(group.inviteKey, person.id, group.organizerToken);
    links.push(link.accessKey);
    yield* savePersonalAddress({ accessKey: link.accessKey, arkAddress: `ark1${"q".repeat(index + 1)}` });
  }
  return links;
});

export const setup = Effect.fn("setupGroup")(function* setup(addresses?: boolean) {
  const group = yield* createGroup({
    name: "Berlin",
    organizerName: "Alice",
    organizerLnurl: "alice@wallet.com",
    participantNames: ["Bob", "Carol"],
    arkAddress: "ark1ace",
  });
  const view = yield* getGroup(group.inviteKey);
  const [alice, bob] = view.participants;
  if (alice === undefined || bob === undefined) {
    return yield* Effect.die("Fixture missing participants");
  }
  const dinner = {
    inviteKey: group.inviteKey,
    expenseId: "00000000-0000-4000-8000-000000000001",
    payerId: alice.id,
    amountSats: 9000,
    description: "Dinner",
    date: "2026-10-01",
  };
  yield* addExpense(dinner);
  yield* addExpense({
    ...dinner,
    expenseId: "00000000-0000-4000-8000-000000000002",
    payerId: bob.id,
    amountSats: 6000,
    description: "Lunch",
  });
  const links = addresses === false ? [] : yield* prepareLinks(group);
  return { ...group, dinner, links };
});
