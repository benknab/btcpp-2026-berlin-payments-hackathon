import type { Database } from "@/db/database";
import { Effect } from "effect";

import type { PotStore } from "./pots/store";

export type GroupActionResult = Readonly<{ ok: true }> | Readonly<{ ok: false; message: string }>;

function requestFailureMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "_tag" in error) {
    if (error._tag === "ConfigError") {
      return "Configure BARK_POT_URL and BARK_POT_TOKEN for an isolated signet pot wallet on the server first.";
    }
    if (
      (error._tag === "GroupError" || error._tag === "PotError") &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message;
    }
  }
  return "Request could not be completed. Refresh to recover saved state; never resend an uncertain payment.";
}

export function safeGroupResult(
  action: () => Effect.Effect<unknown, unknown, Database | PotStore>,
): Effect.Effect<GroupActionResult, never, Database | PotStore> {
  return action().pipe(
    Effect.as({ ok: true } satisfies GroupActionResult),
    Effect.catch((error) =>
      Effect.succeed({
        ok: false,
        message: requestFailureMessage(error),
      } satisfies GroupActionResult),
    ),
  );
}
