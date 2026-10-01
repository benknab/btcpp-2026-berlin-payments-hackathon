import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { PotInputSchema } from "@/lib/pot";
import { makeBark } from "@/server/bark/sdk";
import { NodeServices } from "@effect/platform-node";
import { Effect, Schema } from "effect";

import { demoLayer } from "./demo-database";
import { MAX_DEMO_FUNDING_SAT, simulate } from "./demo-simulation";
import { DemoError, io, makeDemoDirectory, startDemoWallet, walletConfig } from "./demo-wallets";
import type { DemoUserWallet } from "./demo-wallets";

const FIRST_USER_PORT = 3131;
const POT_PORT = 3135;
const DEMO_USERS = 4;
const Fixture = Schema.Struct({
  id: PotInputSchema.fields.id,
  debts: PotInputSchema.fields.debts,
  users: Schema.Array(
    Schema.Struct({
      id: PotInputSchema.fields.users.value.fields.id,
      name: PotInputSchema.fields.users.value.fields.name,
    }),
  ),
});

const demo = Effect.gen(function* demo() {
  const fixture = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Fixture))(
    yield* io(() => readFile("dev/bark/pot.example.json", "utf8")),
  );
  if (fixture.users.length !== DEMO_USERS) {
    yield* new DemoError({ message: "Demo supports exactly four users; adjust ports/budget before changing this" });
    return;
  }
  const fundingConfig = yield* walletConfig(
    process.env["BARK_FUNDING_DATADIR"] ?? path.join(homedir(), ".local", "share", "bark-hackathon-signet"),
    process.env["BARK_FUNDING_URL"] ?? "http://127.0.0.1:3031",
  );
  const funding = makeBark(fundingConfig);
  // Reject any network other than signet before spending.
  yield* funding.fingerprint();
  yield* funding.sync();
  if ((yield* funding.balance()) < MAX_DEMO_FUNDING_SAT) {
    yield* new DemoError({ message: "Shared signet wallet needs at least 26,000 spendable sats" });
    return;
  }
  const directory = yield* makeDemoDirectory();
  yield* Effect.sync((): void => {
    process.stdout.write(`Wallets and durable pot state: ${directory}\n`);
  });
  const users = yield* Effect.forEach(
    fixture.users,
    (user, index) =>
      Effect.gen(function* createUser() {
        const bark = yield* startDemoWallet(path.join(directory, user.id), FIRST_USER_PORT + index);
        return { ...user, bark, arkAddress: yield* bark.address() } satisfies DemoUserWallet;
      }),
    { concurrency: 1 },
  );
  const potBark = yield* startDemoWallet(path.join(directory, "pot"), POT_PORT);
  yield* simulate({
    input: {
      ...fixture,
      users: users.map((user: DemoUserWallet) => ({ id: user.id, name: user.name, arkAddress: user.arkAddress })),
    },
    users,
    potBark,
    funding,
    directory,
  }).pipe(Effect.provide(demoLayer(directory, potBark)));
}).pipe(Effect.scoped, Effect.provide(NodeServices.layer));

const result = await Effect.runPromiseExit(demo);
if (result._tag === "Failure") {
  process.stderr.write(`Pot demo stopped: ${String(result.cause)}\n`);
  process.exitCode = 1;
}
