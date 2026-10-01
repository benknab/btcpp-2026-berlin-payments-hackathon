import type { PotError } from "@/lib/pot";
import { describe, expect, it, vi } from "@effect/vitest";
import { Effect, Layer, Redacted } from "effect";

import { authorizeSettlement, UiPotConfig } from "./ui-config";
import type { UiConfiguration } from "./ui-config";
import { runSettlementAction } from "./ui-service";

const code = "test-operator-secret".repeat(2);
const config: UiConfiguration = {
  basePath: "http://127.0.0.1:3135",
  token: Redacted.make("private-bark-token"),
  accessCode: Redacted.make(code),
};
const ConfigLayer = Layer.succeed(UiPotConfig, config);

describe("settlement operator authorization", (): void => {
  it.effect("authorizes a matching code without exposing the Bark token", (): Effect.Effect<void, PotError> =>
    Effect.gen(function* test() {
      const authorized = yield* authorizeSettlement(code);
      expect(authorized.basePath).toBe(config.basePath);
      expect(JSON.stringify(authorized.token)).not.toContain("private-bark-token");
    }).pipe(Effect.provide(ConfigLayer)),
  );

  it.effect("rejects an incorrect code before any wallet or database action", (): Effect.Effect<void> =>
    Effect.gen(function* test() {
      const fetch = vi.spyOn(globalThis, "fetch");
      const result = yield* Effect.result(runSettlementAction("incorrect", { kind: "open" }));
      expect(result).toMatchObject({
        _tag: "Failure",
        failure: { _tag: "PotError", message: "Incorrect settlement access code" },
      });
      expect(fetch).not.toHaveBeenCalled();
    }).pipe(Effect.provide(ConfigLayer)),
  );
});
