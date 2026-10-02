import path from "node:path";

import { Database } from "@/db/database";
import { Configuration, WalletApi } from "@secondts/barkd";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Redacted, Schedule, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import {
  deploymentIo,
  fileExists,
  loadDeploymentAuth,
  prepareDirectory,
  requireEmptyWallet,
  requireOriginalData,
  writePrivateFile,
} from "./state";
import type { DeploymentAuth } from "./state";

const ROOT = "/data";
const RECEIVER_DIRECTORY = `${ROOT}/receiver`;
const RECEIVER_URL = "http://127.0.0.1:3042";
const TIMEOUT_MS = 5000;
const Mainnet = Schema.Struct({ network: Schema.Literal("bitcoin") });
const Token = Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9_.-]+$/u));
const STARTUP_ATTEMPTS = 60;
const BARK = process.env["BARK_BIN"] ?? "bark";
const BARKD = process.env["BARKD_BIN"] ?? "barkd";

const createReceiver = Effect.fn("createReceiver")(function* createReceiver() {
  yield* prepareDirectory(RECEIVER_DIRECTORY);
  if (yield* requireOriginalData(RECEIVER_DIRECTORY, "db.sqlite")) {
    return yield* Effect.void;
  }
  yield* requireEmptyWallet(RECEIVER_DIRECTORY);
  yield* Effect.logInfo("Creating a new, unfunded mainnet receiver wallet.");
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const code = yield* spawner.exitCode(
    ChildProcess.make(
      BARK,
      [
        "--datadir",
        RECEIVER_DIRECTORY,
        "--no-logfile",
        "create",
        "--mainnet",
        "--ark",
        "https://ark.second.tech",
        "--esplora",
        "https://mempool.second.tech/api",
      ],
      {
        stdin: "ignore",
        stdout: "ignore",
        stderr: "ignore",
        forceKillAfter: "20 seconds",
      },
    ),
  );
  if (code !== 0) {
    return yield* Effect.fail(
      new Error("Receiver creation failed. Check Ark/Esplora connectivity; no funds were sent."),
    );
  }
  return yield* Effect.void;
});

const receiverToken = Effect.fn("receiverToken")(function* receiverToken() {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  // Refresh only on first initialization, never rotate an established wallet's token implicitly.
  const initialized = yield* fileExists(path.join(RECEIVER_DIRECTORY, ".initialized"));
  const command = initialized ? "show" : "refresh";
  const token = yield* spawner
    .string(
      ChildProcess.make(BARKD, ["--datadir", RECEIVER_DIRECTORY, "--no-logfile", "secret", command], {
        stderr: "ignore",
      }),
    )
    .pipe(Effect.mapError(() => new Error("Could not read the receiver token. Restore its original auth data.")));
  const valid = yield* Schema.decodeUnknownEffect(Token)(token.trim()).pipe(
    Effect.mapError(() => new Error("Receiver returned an invalid token.")),
  );
  yield* writePrivateFile(path.join(RECEIVER_DIRECTORY, ".initialized"), "bitcoin\n");
  return Redacted.make(valid);
});

const startReceiver = Effect.fn("startReceiver")(function* startReceiver(token: Readonly<Redacted.Redacted>) {
  const wallet = new WalletApi(new Configuration({ basePath: RECEIVER_URL, accessToken: Redacted.value(token) }));
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const daemon = yield* spawner.spawn(
    ChildProcess.make(
      BARKD,
      ["--datadir", RECEIVER_DIRECTORY, "--host", "127.0.0.1", "--port", "3042", "--no-logfile"],
      {
        stdin: "ignore",
        stdout: "inherit",
        stderr: "inherit",
        forceKillAfter: "20 seconds",
      },
    ),
  );
  yield* deploymentIo(
    () => wallet.arkInfo({ signal: AbortSignal.timeout(TIMEOUT_MS) }),
    "Receiving daemon is not ready or the mainnet Ark server is unavailable.",
  ).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Mainnet)),
    Effect.retry({ times: STARTUP_ATTEMPTS, schedule: Schedule.spaced("1 second") }),
  );
  return { wallet, daemon };
});

const saveRuntimeEnvironment = Effect.fnUntraced(function* saveRuntimeEnvironment(
  auth: DeploymentAuth,
  token: Readonly<Redacted.Redacted>,
) {
  yield* writePrivateFile(
    path.join(ROOT, "runtime.env"),
    [
      "DATABASE_URL=file:/data/mainnet.db",
      `BARK_RECEIVER_URL=${RECEIVER_URL}`,
      `BARK_RECEIVER_TOKEN=${Redacted.value(token)}`,
      "BARK_RECEIVER_DATADIR=/data/receiver",
      "BARK_POTS_DATADIR=/data/pots",
      "PAYMENTS_LOG_DIR=/data/logs",
      `APP_AUTH_USERNAME=${auth.username}`,
      `APP_AUTH_PASSWORD=${auth.password}`,
      "",
    ].join("\n"),
  );
  yield* writePrivateFile(path.join(ROOT, ".initialized"), "bitcoin\n");
  process.env["BARK_RECEIVER_URL"] = RECEIVER_URL;
  process.env["BARK_RECEIVER_TOKEN"] = Redacted.value(token);
});

export const initializeDeployment = Effect.fn("initializeDeployment")(function* initializeDeployment() {
  const auth = yield* loadDeploymentAuth(ROOT);
  yield* createReceiver();
  const token = yield* receiverToken();
  const receiver = yield* startReceiver(token);
  yield* migrate(yield* Database, { migrationsFolder: "./drizzle" });
  yield* saveRuntimeEnvironment(auth, token);
  yield* Effect.logInfo("Mainnet receiver ready; database migrations applied.");
  return { auth, ...receiver };
});
