import type { Database } from "@/db/database";
import { Effect } from "effect";

import type { PotStore } from "./pots/store";

export type GroupActionResult = Readonly<{ ok: true }> | Readonly<{ ok: false; message: string }>;

export function safeGroupResult(
  action: () => Effect.Effect<unknown, unknown, Database | PotStore>,
): Effect.Effect<GroupActionResult, never, Database | PotStore> {
  return action().pipe(
    Effect.as({ ok: true } satisfies GroupActionResult),
    Effect.catch((error) =>
      Effect.succeed({
        ok: false,
        message:
          typeof error === "object" &&
          error !== null &&
          "_tag" in error &&
          "message" in error &&
          typeof error.message === "string" &&
          (error._tag === "GroupError" || error._tag === "PotError")
            ? error.message
            : "Request could not be completed. Refresh to recover saved state; never resend an uncertain payment.",
      } satisfies GroupActionResult),
    ),
  );
}
