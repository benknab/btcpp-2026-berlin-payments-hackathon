import { mkdir, mkdtemp } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { makeBark } from "@/server/bark/sdk";
import type { BarkConfig } from "@/server/bark/sdk";
import type { BarkOperations } from "@/server/bark/service";
import { Effect, Redacted, Schedule, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const STARTUP_ATTEMPTS = 30;
const STARTUP_DELAY_MS = 100;
const startupRetry = { times: STARTUP_ATTEMPTS, schedule: Schedule.spaced(STARTUP_DELAY_MS) };

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory, not an Error constructor.
export class DemoError extends Schema.TaggedError<DemoError>()("DemoError", { message: Schema.String }) {}

export function io<Value>(run: () => Promise<Value>): Effect.Effect<Value, DemoError> {
  return Effect.tryPromise({ try: run, catch: (): DemoError => new DemoError({ message: "Demo I/O failed" }) });
}

export const makeDemoDirectory = Effect.fn("makeDemoDirectory")(function* makeDemoDirectory() {
  const root = path.join(homedir(), ".local", "share", "bark-pot-demos");
  yield* io(() => mkdir(root, { recursive: true, mode: 0o700 }));
  return yield* io(() => mkdtemp(path.join(root, "run-")));
});

export const walletConfig = Effect.fn("walletConfig")(function* walletConfig(datadir: string, basePath: string) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const stdout = yield* spawner
    .string(
      ChildProcess.make("barkd", ["--datadir", datadir, "secret", "show"], {
        stderr: "ignore",
      }),
    )
    .pipe(Effect.mapError((): DemoError => new DemoError({ message: "Cannot read daemon token" })));
  const token = yield* Schema.decodeUnknownEffect(Schema.NonEmptyString)(stdout.trim()).pipe(
    Effect.mapError((): DemoError => new DemoError({ message: "Empty daemon token" })),
  );
  return { basePath, token: Redacted.make(token) } satisfies BarkConfig;
});

export const startDemoWallet = Effect.fn("startDemoWallet")(function* startDemoWallet(datadir: string, port: number) {
  yield* io(() => mkdir(datadir, { mode: 0o700 }));
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const daemon = yield* spawner
    .spawn(
      ChildProcess.make(
        "barkd",
        ["--datadir", datadir, "--host", "127.0.0.1", "--port", String(port), "--quiet", "--no-logfile"],
        { stdin: "ignore", stdout: "ignore", stderr: "ignore" },
      ),
    )
    .pipe(Effect.mapError((): DemoError => new DemoError({ message: "Cannot start Bark daemon" })));
  const config = yield* walletConfig(datadir, `http://127.0.0.1:${port}`).pipe(Effect.retry(startupRetry));
  const bark = makeBark(config);
  yield* Effect.gen(function* ready() {
    const running = yield* daemon.isRunning.pipe(
      Effect.mapError((): DemoError => new DemoError({ message: "Cannot check Bark daemon" })),
    );
    if (!running) {
      return yield* new DemoError({ message: "Bark daemon exited during startup" });
    }
    return yield* bark.ready();
  }).pipe(Effect.retry(startupRetry));
  yield* bark.createSignetWallet();
  return bark;
});

export interface DemoUserWallet {
  readonly id: string;
  readonly name: string;
  readonly arkAddress: string;
  readonly bark: BarkOperations;
}
