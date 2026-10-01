import { PotError } from "@/lib/pot";
import { loadEnvironment } from "@/server/env";
import { Config, Context, Effect, Layer, Redacted } from "effect";

loadEnvironment();

export interface UiConfiguration {
  readonly basePath: string;
  readonly token: Readonly<Redacted.Redacted>;
}

export class UiPotConfig extends Context.Service<UiPotConfig, UiConfiguration>()("payments/pots/UiPotConfig") {}

export const UiPotConfigLive = Layer.effect(
  UiPotConfig,
  Config.all({
    basePath: Config.String("BARK_POT_URL").pipe(Config.withDefault("http://127.0.0.1:3135")),
    token: Config.Redacted("BARK_POT_TOKEN"),
  }).pipe(
    Effect.flatMap((config: UiConfiguration) =>
      Redacted.value(config.token).length > 0
        ? Effect.succeed(config)
        : Effect.fail(new PotError({ message: "Settlement UI needs a Bark daemon token" })),
    ),
  ),
);
