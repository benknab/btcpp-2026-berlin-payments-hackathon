import { BarkError } from "@/server/bark/service";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";

import { waitForPotFingerprint } from "./wallet-readiness";

describe("pot wallet readiness", () => {
  it.effect("retries a read-only mainnet check until an existing wallet is ready", () =>
    Effect.gen(function* test() {
      let calls = 0;
      const fingerprint = Effect.suspend(() => {
        calls += 1;
        return calls < 3
          ? Effect.fail(new BarkError({ operation: "arkInfo", message: "Not connected yet" }))
          : Effect.succeed("original-wallet");
      });
      const fiber = yield* waitForPotFingerprint({ fingerprint: () => fingerprint }).pipe(Effect.forkChild);
      yield* TestClock.adjust("3 seconds");
      expect(yield* Fiber.join(fiber)).toBe("original-wallet");
      expect(calls).toBe(3);
    }),
  );

  it.effect("fails closed when readiness never succeeds", () =>
    Effect.gen(function* test() {
      const fiber = yield* waitForPotFingerprint({
        fingerprint: () => Effect.fail(new BarkError({ operation: "arkInfo", message: "Unavailable" })),
      }).pipe(Effect.result, Effect.forkChild);
      yield* TestClock.adjust("31 seconds");
      expect(yield* Fiber.join(fiber)).toMatchObject({
        _tag: "Failure",
        failure: { message: "Could not verify the pot's mainnet wallet" },
      });
    }),
  );

  it.effect("bounds even a hanging readiness request", () =>
    Effect.gen(function* test() {
      const fiber = yield* waitForPotFingerprint({ fingerprint: () => Effect.never }).pipe(
        Effect.result,
        Effect.forkChild,
      );
      yield* TestClock.adjust("31 seconds");
      expect(yield* Fiber.join(fiber)).toMatchObject({ _tag: "Failure" });
    }),
  );
});
