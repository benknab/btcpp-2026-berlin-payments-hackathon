import { access, mkdir, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { Effect, Schema } from "effect";

const MissingFile = Schema.Struct({ code: Schema.Literal("ENOENT") });
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
