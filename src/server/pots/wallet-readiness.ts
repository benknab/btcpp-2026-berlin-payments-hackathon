import { PotError } from "@/lib/pot";
import type { BarkOperations } from "@/server/bark/service";
import { Effect, Schedule } from "effect";

const READINESS_RETRIES = 30;

// Existing wallets can answer walletExists before their Ark connection is ready.
// Retry only this read-only check, never wallet creation or payment operations.
export function waitForPotFingerprint(bark: Pick<BarkOperations, "fingerprint">): Effect.Effect<string, PotError> {
  return bark.fingerprint().pipe(
    Effect.retry({ times: READINESS_RETRIES, schedule: Schedule.spaced("1 second") }),
    Effect.timeout("30 seconds"),
    Effect.mapError(() => new PotError({ message: "Could not verify the pot's mainnet wallet" })),
  );
}
