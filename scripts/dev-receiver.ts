import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, open } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { Configuration, WalletApi } from "@secondts/barkd";
import { Effect, Redacted, Schedule, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const RECEIVER_URL = "http://127.0.0.1:3042";
const REQUEST_TIMEOUT_MS = 3000;
const STARTUP_ATTEMPTS = 30;
const STARTUP_DELAY_MS = 1000;
const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;
const Mainnet = Schema.Struct({ network: Schema.Literal("bitcoin") });

const initializeWallet = Effect.fn("initializeDevReceiver")(function* initializeWallet(datadir: string) {
  if (existsSync(path.join(datadir, "db.sqlite"))) {
    return;
  }
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const code = yield* spawner.exitCode(
    ChildProcess.make(
      process.env["BARK_BIN"] ?? "bark",
      [
        "--datadir",
        datadir,
        "create",
        "--mainnet",
        "--ark",
        "https://ark.second.tech",
        "--esplora",
        "https://mempool.second.tech/api",
      ],
      { stdout: "inherit", stderr: "inherit" },
    ),
  );
  if (code !== 0) {
    yield* Effect.fail(new Error("Could not create the mainnet receiving wallet."));
  }
});

// This daemon deliberately outlives Vite so offline Lightning receipts can finish delivery.
const startDaemon = Effect.fn("startDevReceiver")(function* startDaemon(datadir: string) {
  const log = yield* Effect.acquireRelease(
    Effect.tryPromise(() => open(path.join(datadir, "dev-barkd.log"), "a", FILE_MODE)),
    (file: Readonly<FileHandle>) => Effect.promise(() => file.close()),
  );
  yield* Effect.tryPromise(
    () =>
      new Promise<void>((resolve, reject) => {
        const daemon = spawn(
          process.env["BARKD_BIN"] ?? "barkd",
          ["--datadir", datadir, "--host", "127.0.0.1", "--port", "3042", "--no-logfile"],
          { detached: true, stdio: ["ignore", log.fd, log.fd] },
        );
        daemon.once("error", reject);
        daemon.once("spawn", () => {
          daemon.unref();
          resolve();
        });
      }),
  );
});

const readToken = Effect.fn("readDevReceiverToken")(function* readToken(datadir: string) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const token = yield* spawner.string(
    ChildProcess.make(process.env["BARKD_BIN"] ?? "barkd", ["--datadir", datadir, "secret", "show"], {
      stderr: "ignore",
    }),
  );
  return Redacted.make(yield* Schema.decodeUnknownEffect(Schema.NonEmptyString)(token.trim()));
});

function receiverInfo(basePath: string, token: Readonly<Redacted.Redacted>): Effect.Effect<unknown, Error> {
  const wallet = new WalletApi(new Configuration({ basePath, accessToken: Redacted.value(token) }));
  return Effect.tryPromise({
    try: () => wallet.arkInfo({ signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
    catch: () => new Error("Receiving daemon unavailable. Check its URL, token, and dev-barkd.log."),
  });
}

const localReceiver = Effect.fn("localDevReceiver")(function* localReceiver() {
  const datadir =
    process.env["BARK_RECEIVER_DATADIR"] ?? path.join(homedir(), ".local/share/bark-event-receiver-mainnet");
  yield* Effect.tryPromise(() => mkdir(datadir, { recursive: true, mode: DIRECTORY_MODE }));
  yield* initializeWallet(datadir);
  const initialToken = yield* Effect.result(readToken(datadir));
  if (initialToken._tag === "Success") {
    const running = yield* Effect.result(receiverInfo(RECEIVER_URL, initialToken.success));
    if (running._tag === "Success") {
      yield* Schema.decodeUnknownEffect(Mainnet)(running.success);
      return { basePath: RECEIVER_URL, token: initialToken.success };
    }
  }

  yield* startDaemon(datadir);
  const config = yield* Effect.gen(function* awaitReceiver() {
    const token = yield* readToken(datadir);
    const info = yield* receiverInfo(RECEIVER_URL, token);
    return { token, info };
  }).pipe(Effect.retry({ times: STARTUP_ATTEMPTS, schedule: Schedule.spaced(STARTUP_DELAY_MS) }));
  yield* Schema.decodeUnknownEffect(Mainnet)(config.info);
  return { basePath: RECEIVER_URL, token: config.token };
});

export const prepareReceiver = Effect.fn("prepareDevReceiver")(function* prepareReceiver() {
  const configuredUrl = process.env["BARK_RECEIVER_URL"];
  const configuredToken = process.env["BARK_RECEIVER_TOKEN"];
  if (configuredUrl === undefined && configuredToken === undefined) {
    return yield* localReceiver();
  }
  if (configuredUrl === undefined || configuredToken === undefined || configuredToken.length === 0) {
    return yield* Effect.fail(new Error("Set both BARK_RECEIVER_URL and BARK_RECEIVER_TOKEN, or neither."));
  }
  const token = Redacted.make(configuredToken);
  yield* Schema.decodeUnknownEffect(Mainnet)(yield* receiverInfo(configuredUrl, token));
  return { basePath: configuredUrl, token };
});
