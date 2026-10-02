import { PotError } from "@/lib/pot";
import { makeBark } from "@/server/bark/sdk";
import type { BarkConfig } from "@/server/bark/sdk";
import type { BarkOperations } from "@/server/bark/service";
import { NodeServices } from "@effect/platform-node";
import { Configuration, WalletApi } from "@secondts/barkd";
import { Context, Effect, Layer, Redacted, Schedule, Schema } from "effect";
import type { Scope } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { prepareWalletDirectory, walletIo } from "./wallet-directory";

const STARTUP_ATTEMPTS = 30;
const STARTUP_DELAY_MS = 100;
const DAEMON_TIMEOUT_MS = 3000;
const startupRetry = { times: STARTUP_ATTEMPTS, schedule: Schedule.spaced(STARTUP_DELAY_MS) };

export interface PotWalletOperations {
  readonly open: (id: number | string, allowCreate: boolean) => Effect.Effect<BarkOperations, PotError, Scope.Scope>;
}
export class PotWallet extends Context.Service<PotWallet, PotWalletOperations>()("payments/PotWallet") {}

const daemonConfig = Effect.fn("potDaemonConfig")(function* daemonConfig(datadir: string, port: number) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const token = yield* spawner
    .string(
      ChildProcess.make(process.env["BARKD_BIN"] ?? "barkd", ["--datadir", datadir, "secret", "show"], {
        stderr: "ignore",
      }),
    )
    .pipe(Effect.mapError((): PotError => new PotError({ message: "Pot wallet is still starting" })));
  const valid = yield* Schema.decodeUnknownEffect(Schema.NonEmptyString)(token.trim()).pipe(
    Effect.mapError((): PotError => new PotError({ message: "Pot wallet is still starting" })),
  );
  return { basePath: `http://127.0.0.1:${port}`, token: Redacted.make(valid) } satisfies BarkConfig;
});

const initializeWallet = Effect.fn("initializePotWallet")(function* initializeWallet(
  config: BarkConfig,
  allowCreate: boolean,
) {
  const wallet = new WalletApi(
    new Configuration({ basePath: config.basePath, accessToken: Redacted.value(config.token) }),
  );
  const info = yield* walletIo(
    () => wallet.walletExists({ signal: AbortSignal.timeout(DAEMON_TIMEOUT_MS) }),
    "Pot wallet is still starting",
  ).pipe(Effect.retry(startupRetry));
  const valid = yield* Schema.decodeUnknownEffect(
    Schema.Struct({ fingerprint: Schema.optional(Schema.NullOr(Schema.NonEmptyString)) }),
  )(info).pipe(Effect.mapError((): PotError => new PotError({ message: "Pot wallet returned an invalid response" })));
  const bark = makeBark(config);
  if (valid.fingerprint === undefined || valid.fingerprint === null) {
    if (!allowCreate) {
      return yield* new PotError({
        message: "This pot's wallet data is missing. Restore its original wallet before continuing",
      });
    }
    yield* bark.createSignetWallet().pipe(
      Effect.mapError(
        (): PotError =>
          new PotError({
            message: "Could not create the pot's signet wallet. Its details are saved; try preparing deposits again",
          }),
      ),
    );
  }
  yield* bark
    .fingerprint()
    .pipe(Effect.mapError((): PotError => new PotError({ message: "Could not verify the pot's signet wallet" })));
  if (allowCreate && ((yield* bark.balance()) > 0 || (yield* bark.history()).length > 0)) {
    return yield* new PotError({
      message: "This wallet already has payment history. Restore its original pot database before continuing",
    });
  }
  return bark;
});

const openWallet = Effect.fn("openPotWallet")(function* openWallet(id: number | string, allowCreate: boolean) {
  const { datadir, port } = yield* prepareWalletDirectory(id);
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  yield* spawner
    .spawn(
      ChildProcess.make(
        process.env["BARKD_BIN"] ?? "barkd",
        ["--datadir", datadir, "--host", "127.0.0.1", "--port", String(port), "--quiet", "--no-logfile"],
        { stdin: "ignore", stdout: "ignore", stderr: "ignore" },
      ),
    )
    .pipe(
      Effect.mapError(
        (): PotError =>
          new PotError({ message: "Payments are unavailable on this server. Your pot details are saved" }),
      ),
    );
  return yield* initializeWallet(yield* daemonConfig(datadir, port).pipe(Effect.retry(startupRetry)), allowCreate);
});

export const PotWalletLive = Layer.effect(
  PotWallet,
  Effect.gen(function* walletService() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    return {
      open: (id, allowCreate): Effect.Effect<BarkOperations, PotError, Scope.Scope> =>
        openWallet(id, allowCreate).pipe(
          Effect.mapError((error: unknown): PotError =>
            error instanceof PotError
              ? error
              : new PotError({ message: "Could not read this pot's wallet. Its details are saved" }),
          ),
          Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        ),
    } satisfies PotWalletOperations;
  }),
).pipe(Layer.provide(NodeServices.layer));
