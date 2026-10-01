import { writeFile } from "node:fs/promises";
import path from "node:path";

import { Database } from "@/db/database";
import { PotError } from "@/lib/pot";
import type { Pot, PotInput } from "@/lib/pot";
import type { BarkOperations } from "@/server/bark/service";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect } from "effect";

import { DemoError, io } from "./demo-wallets";
import type { DemoUserWallet } from "./demo-wallets";
import { receivedAt } from "./receipts";
import { confirmPot, createPot, settlePot } from "./service";

const USER_FUNDING_SAT = 12_000;
const POT_FEE_RESERVE_SAT = 2000;
export const MAX_DEMO_FUNDING_SAT = 26_000;
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

export const simulate = Effect.fn("simulatePot")(function* simulate(options: Simulation) {
  const database = yield* Database;
  yield* migrate(database, { migrationsFolder: "./drizzle" });
  let pot = yield* createPot(options.input);
  // All payout and per-user deposit addresses exist before funding.
  yield* report(pot);
  const payers = pot.participants.filter((participant): boolean => participant.payInSat > 0);
  if (
    payers.length * USER_FUNDING_SAT + POT_FEE_RESERVE_SAT > MAX_DEMO_FUNDING_SAT ||
    payers.some((payer): boolean => payer.payInSat > USER_FUNDING_SAT)
  ) {
    yield* new DemoError({ message: "Fixture exceeds the explicit 26,000-sat funding budget" });
    return;
  }
  // Separate reserve is not credited to any participant's contribution.
  yield* options.funding.send(yield* options.potBark.address(), POT_FEE_RESERVE_SAT);
  for (const payer of payers) {
    const user = options.users.find((candidate): boolean => candidate.id === payer.userId);
    if (user === undefined) {
      yield* new DemoError({ message: "Missing demo wallet" });
      return;
    }
    yield* options.funding.send(user.arkAddress, USER_FUNDING_SAT);
    yield* user.bark.sync();
    yield* user.bark.send(payer.depositAddress, payer.payInSat);
    pot = yield* confirmPot(pot.id);
    yield* report(pot);
  }
  pot = yield* settlePot(pot.id);
  yield* verifyRecipients(pot, options.users);
  yield* report(pot);
  yield* io(() =>
    writeFile(path.join(options.directory, "result.json"), JSON.stringify(pot, null, JSON_INDENT), { mode: 0o600 }),
  );
});
