import { ConfigProvider, Effect } from "effect";

export function withServerConfiguration<Value, Failure, Requirements>(
  effect: Effect.Effect<Value, Failure, Requirements>,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Effect.Effect<Value, Failure, Requirements> {
  // Deployment injects receiver credentials after Effect's default environment snapshot is cached.
  return Effect.suspend(() =>
    effect.pipe(Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnvRecord(environment))),
  );
}
