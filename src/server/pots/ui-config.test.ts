import { describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Effect, Redacted } from "effect";

import { UiPotConfig, UiPotConfigLive } from "./ui-config";

describe("settlement daemon configuration", (): void => {
  it.effect("loads the Bark token without an operator access code", (): Effect.Effect<void, unknown> =>
    Effect.gen(function* test() {
      const config = yield* UiPotConfig;
      expect(config.basePath).toBe("http://127.0.0.1:3135");
      expect(Redacted.value(config.token)).toBe("private-bark-token");
      expect(JSON.stringify(config)).not.toContain("private-bark-token");
    }).pipe(
      Effect.provide(UiPotConfigLive),
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ BARK_POT_TOKEN: "private-bark-token" }))),
    ),
  );

  it.effect.each([{}, { BARK_POT_TOKEN: "" }])(
    "rejects missing or empty daemon configuration %j",
    (environment: Readonly<{ BARK_POT_TOKEN?: string }>): Effect.Effect<void> =>
      Effect.gen(function* test() {
        const result = yield* Effect.result(
          Effect.service(UiPotConfig).pipe(
            Effect.provide(UiPotConfigLive),
            Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(environment))),
          ),
        );
        expect(result._tag).toBe("Failure");
      }),
  );
});
