import { writeFile } from "node:fs/promises";
import path from "node:path";

import { Database } from "@/db/database";
import { PotError } from "@/lib/pot";
import type { Pot, PotInput, PotParticipant } from "@/lib/pot";
import type { BarkOperations } from "@/server/bark/service";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect } from "effect";

import { DemoError, io } from "./demo-wallets";
import type { DemoUserWallet } from "./demo-wallets";
import { receivedAt } from "./receipts";
import { confirmPot, createPot, settlePot } from "./service";

const USER_FUNDING_SAT = 1200;
const POT_FEE_RESERVE_SAT = 500;
export const MAX_DEMO_FUNDING_SAT = 2900;
const JSON_INDENT = 2;

interface Simulation {
  readonly input: PotInput;
  readonly users: readonly DemoUserWallet[];
  readonly funding: BarkOperations;
  readonly potBark: BarkOperations;
  readonly directory: string;
}

function report(pot: Pot): Effect.Effect<void> {
  return Effect.sync((): void => {
    process.stdout.write(`${JSON.stringify(pot, null, JSON_INDENT)}\n`);
  });
}

const verifyRecipients = Effect.fn("verifyRecipients")(function* verifyRecipients(
  pot: Pot,
  users: readonly DemoUserWallet[],
) {
  for (const participant of pot.participants) {
    if (participant.receiveSat > 0) {
      const user = users.find((candidate): boolean => candidate.id === participant.userId);
      if (user === undefined) {
        yield* new DemoError({ message: "Missing recipient wallet" });
        return;
      }
      yield* user.bark.sync();
      const received = receivedAt(participant.payoutAddress, yield* user.bark.history());
      if (received !== participant.receiveSat) {
        yield* new PotError({ message: "Recipient wallet did not confirm the exact payout" });
      }
    }
  }
});

const fundPayer = Effect.fn("fundDemoPayer")(function* fundPayer(options: Simulation, payer: PotParticipant) {
  const user = options.users.find((candidate): boolean => candidate.id === payer.userId);
  if (user === undefined) {
    yield* new DemoError({ message: "Missing demo wallet" });
    return;
  }
  yield* options.funding.send(user.arkAddress, USER_FUNDING_SAT);
  yield* user.bark.sync();
  yield* user.bark.send(payer.depositAddress, payer.payInSat);
});

const fundPot = Effect.fn("fundDemoPot")(function* fundPot(options: Simulation, pot: Pot) {
  const payers = pot.participants.filter((participant): boolean => participant.payInSat > 0);
  if (
    payers.length * USER_FUNDING_SAT + POT_FEE_RESERVE_SAT > MAX_DEMO_FUNDING_SAT ||
    payers.some((payer): boolean => payer.payInSat > USER_FUNDING_SAT)
  ) {
    yield* new DemoError({ message: "Fixture exceeds the explicit 2,900-sat funding budget" });
    return;
  }
  // Separate reserve is not credited to any participant's contribution.
  yield* options.funding.send(yield* options.potBark.address(), POT_FEE_RESERVE_SAT);
  for (const payer of payers) {
    yield* fundPayer(options, payer);
    yield* report(yield* confirmPot(pot.id));
  }
});

export const simulate = Effect.fn("simulatePot")(function* simulate(options: Simulation) {
  const database = yield* Database;
  yield* migrate(database, { migrationsFolder: "./drizzle" });
  const initial = yield* createPot(options.input);
  // All payout and per-user deposit addresses exist before funding.
  yield* report(initial);
  yield* fundPot(options, initial);
  const pot = yield* settlePot(initial.id);
  yield* verifyRecipients(pot, options.users);
  yield* report(pot);
  yield* io(() =>
    writeFile(path.join(options.directory, "result.json"), JSON.stringify(pot, null, JSON_INDENT), { mode: 0o600 }),
  );
});
