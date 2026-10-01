import { createHash, timingSafeEqual } from "node:crypto";

import { PotError } from "@/lib/pot";
import { loadEnvironment } from "@/server/env";
import { Config, Context, Effect, Layer, Redacted } from "effect";

loadEnvironment();

const MIN_ACCESS_CODE_LENGTH = 32;
export interface UiConfiguration {
  readonly basePath: string;
  readonly token: Readonly<Redacted.Redacted>;
  readonly accessCode: Readonly<Redacted.Redacted>;
}

export class UiPotConfig extends Context.Service<UiPotConfig, UiConfiguration>()("payments/pots/UiPotConfig") {}

export const UiPotConfigLive = Layer.effect(
  UiPotConfig,
  Config.all({
    basePath: Config.String("BARK_POT_URL").pipe(Config.withDefault("http://127.0.0.1:3135")),
    token: Config.Redacted("BARK_POT_TOKEN"),
    accessCode: Config.Redacted("POT_UI_ACCESS_CODE"),
  }).pipe(
    Effect.flatMap((config: UiConfiguration) =>
      Redacted.value(config.accessCode).length >= MIN_ACCESS_CODE_LENGTH && Redacted.value(config.token).length > 0
        ? Effect.succeed(config)
        : Effect.fail(
            new PotError({ message: "Settlement UI needs a Bark token and an access code of at least 32 characters" }),
          ),
    ),
  ),
);

export const authorizeSettlement = Effect.fn("authorizeSettlement")(function* authorizeSettlement(accessCode: string) {
  const config = yield* UiPotConfig;
  const supplied = createHash("sha256").update(accessCode).digest();
  const expected = createHash("sha256").update(Redacted.value(config.accessCode)).digest();
  if (!timingSafeEqual(supplied, expected)) {
    return yield* new PotError({ message: "Incorrect settlement access code" });
  }
  return config;
});
