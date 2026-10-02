import { homedir } from "node:os";
import path from "node:path";

import { ParticipantAddressRequest } from "@/lib/participant-addresses";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer, Redacted, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { makeBark } from "./sdk";
import { Bark, BarkError } from "./service";

export const generateTestAddresses = Effect.fn("generateTestParticipantAddresses")(function* generateTestAddresses(
  count: number,
) {
  const valid = yield* Schema.decodeUnknownEffect(ParticipantAddressRequest)({ count });
  const bark = yield* Bark;
  // Fingerprint verifies the configured Ark server is signet before allocating addresses.
  yield* bark.fingerprint();
  return yield* Effect.forEach(Array.from({ length: valid.count }), () => bark.address(), { concurrency: 1 });
});

// These are distinct receive addresses in the shared developer wallet, not personal wallets.
export const TestParticipantWalletLive = Layer.effect(
  Bark,
  Effect.gen(function* testWallet() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const datadir =
      process.env["BARK_FUNDING_DATADIR"] ?? path.join(homedir(), ".local", "share", "bark-hackathon-signet");
    const token = yield* spawner
      .string(
        ChildProcess.make(process.env["BARKD_BIN"] ?? "barkd", ["--datadir", datadir, "secret", "show"], {
          stderr: "ignore",
        }),
      )
      .pipe(
        Effect.mapError(() => new BarkError({ operation: "testWallet", message: "Cannot read test wallet token" })),
      );
    const valid = yield* Schema.decodeUnknownEffect(Schema.NonEmptyString)(token.trim());
    return makeBark({
      basePath: process.env["BARK_FUNDING_URL"] ?? "http://127.0.0.1:3031",
      token: Redacted.make(valid),
    });
  }),
).pipe(Layer.provide(NodeServices.layer));
