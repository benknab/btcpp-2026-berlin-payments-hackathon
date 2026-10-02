import { randomBytes } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

import { Effect, Schema } from "effect";

const MINIMUM_PASSWORD_LENGTH = 24;
const USERNAME = Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9_-]+$/u));
const PASSWORD = Schema.String.check(
  Schema.isMinLength(MINIMUM_PASSWORD_LENGTH),
  Schema.isPattern(/^[a-zA-Z0-9_-]+$/u),
);
const AuthCredentials = Schema.Struct({ username: USERNAME, password: PASSWORD });
const MissingFile = Schema.Struct({ code: Schema.Literal("ENOENT") });
export type DeploymentAuth = typeof AuthCredentials.Type;
const PASSWORD_BYTES = 32;
const FILE_MODE = 0o600;
const DIRECTORY_MODE = 0o700;

export function deploymentIo<Value>(run: () => Promise<Value>, message: string): Effect.Effect<Value, Error> {
  return Effect.tryPromise({ try: run, catch: () => new Error(message) });
}

export const fileExists = Effect.fnUntraced(function* fileExists(filename: string) {
  return yield* Effect.tryPromise(() => access(filename)).pipe(
    Effect.as(true),
    Effect.catch((error) =>
      Schema.is(MissingFile)(error.cause)
        ? Effect.succeed(false)
        : Effect.fail(new Error("Could not inspect deployment data. Check volume permissions.")),
    ),
  );
});

export const writePrivateFile = Effect.fnUntraced(function* writePrivateFile(filename: string, content: string) {
  const temporary = `${filename}.tmp`;
  yield* deploymentIo(() => writeFile(temporary, content, { mode: FILE_MODE }), "Could not write deployment state.");
  yield* deploymentIo(() => rename(temporary, filename), "Could not save deployment state.");
});

export const prepareDirectory = Effect.fnUntraced(function* prepareDirectory(directory: string) {
  yield* deploymentIo(
    () => mkdir(directory, { recursive: true, mode: DIRECTORY_MODE }),
    "Could not create the deployment data directory. Check volume ownership (UID 1000).",
  );
});

// Markers prevent a restart from silently replacing missing wallet or bookkeeping data.
export const requireOriginalData = Effect.fnUntraced(function* requireOriginalData(
  directory: string,
  filename: string,
) {
  const marker = path.join(directory, ".initialized");
  const exists = yield* fileExists(path.join(directory, filename));
  if (!exists && (yield* fileExists(marker))) {
    return yield* Effect.fail(
      new Error(`Original ${filename} is missing; restore /data from backup before restarting.`),
    );
  }
  return exists;
});

export const requireEmptyWallet = Effect.fnUntraced(function* requireEmptyWallet(directory: string) {
  const entries = yield* deploymentIo(() => readdir(directory), "Could not inspect receiver wallet data.");
  if (entries.length > 0) {
    return yield* Effect.fail(
      new Error("Receiver directory is incomplete; restore or inspect it. It will not be overwritten."),
    );
  }
  return yield* Effect.void;
});

export function configuredValue(value: string | undefined): string | undefined {
  return value === "" ? undefined : value;
}

export const loadDeploymentAuth = Effect.fnUntraced(function* loadDeploymentAuth(directory: string) {
  const filename = path.join(directory, "runtime.env");
  const saved = (yield* fileExists(filename))
    ? parseEnv(yield* deploymentIo(() => readFile(filename, "utf8"), "Could not read deployment credentials."))
    : {};
  const username = configuredValue(process.env["APP_AUTH_USERNAME"]) ?? saved["APP_AUTH_USERNAME"] ?? "admin";
  const password =
    configuredValue(process.env["APP_AUTH_PASSWORD"]) ??
    saved["APP_AUTH_PASSWORD"] ??
    randomBytes(PASSWORD_BYTES).toString("base64url");
  return yield* Schema.decodeUnknownEffect(AuthCredentials)({ username, password }).pipe(
    Effect.mapError(
      () => new Error("Use an alphanumeric auth username and a password of at least 24 URL-safe characters."),
    ),
  );
});
