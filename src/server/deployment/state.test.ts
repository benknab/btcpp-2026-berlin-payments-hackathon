import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseEnv } from "node:util";

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { fileExists, loadDeploymentAuth, requireEmptyWallet, requireOriginalData, writePrivateFile } from "./state";

const temporaryDirectory = Effect.acquireRelease(
  Effect.tryPromise(() => mkdtemp(path.join(tmpdir(), "payments-deployment-test-"))),
  (directory) => Effect.promise(() => rm(directory, { recursive: true, force: true })),
);

describe("deployment persistence", () => {
  it.effect("generates private credentials and reuses them on restart", () =>
    Effect.gen(function* persistCredentials() {
      const directory = yield* temporaryDirectory;
      const initial = yield* loadDeploymentAuth(directory);
      expect(initial.username).toBe("admin");
      expect(initial.password.length).toBeGreaterThanOrEqual(24);
      const filename = path.join(directory, "runtime.env");
      yield* writePrivateFile(
        filename,
        `APP_AUTH_USERNAME=${initial.username}\nAPP_AUTH_PASSWORD=${initial.password}\n`,
      );
      expect(yield* loadDeploymentAuth(directory)).toEqual(initial);
      const permissions = yield* Effect.tryPromise(() => stat(filename));
      expect(permissions.mode.toString(8).slice(-3)).toBe("600");
      const saved = parseEnv(yield* Effect.tryPromise(() => readFile(filename, "utf8")));
      expect(saved["APP_AUTH_PASSWORD"]).toBe(initial.password);
      expect(yield* fileExists(`${filename}.tmp`)).toBe(false);
    }).pipe(Effect.scoped),
  );

  it.effect("allows an empty fresh data directory", () =>
    Effect.gen(function* freshDirectory() {
      const directory = yield* temporaryDirectory;
      expect(yield* requireOriginalData(directory, "db.sqlite")).toBe(false);
      yield* requireEmptyWallet(directory);
    }).pipe(Effect.scoped),
  );

  it.effect.each(["db.sqlite", "mainnet.db"])("refuses to replace missing initialized %s", (filename) =>
    Effect.gen(function* refuseReplacement() {
      const directory = yield* temporaryDirectory;
      yield* writePrivateFile(path.join(directory, ".initialized"), "bitcoin\n");
      const result = yield* Effect.result(requireOriginalData(directory, filename));
      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(result.failure.message).toContain("restore /data from backup");
      }
    }).pipe(Effect.scoped),
  );

  it.effect("reuses original wallet data", () =>
    Effect.gen(function* reuseWallet() {
      const directory = yield* temporaryDirectory;
      yield* writePrivateFile(path.join(directory, ".initialized"), "bitcoin\n");
      yield* Effect.tryPromise(() => writeFile(path.join(directory, "db.sqlite"), "existing-wallet"));
      expect(yield* requireOriginalData(directory, "db.sqlite")).toBe(true);
    }).pipe(Effect.scoped),
  );

  it.effect("does not overwrite an incomplete wallet directory", () =>
    Effect.gen(function* incompleteWallet() {
      const directory = yield* temporaryDirectory;
      yield* Effect.tryPromise(() => writeFile(path.join(directory, "mnemonic"), "existing-data"));
      const result = yield* Effect.result(requireEmptyWallet(directory));
      expect(result._tag).toBe("Failure");
      expect(yield* Effect.tryPromise(() => readFile(path.join(directory, "mnemonic"), "utf8"))).toBe("existing-data");
    }).pipe(Effect.scoped),
  );

  it.effect("rejects invalid saved credentials without leaking them", () =>
    Effect.gen(function* invalidCredentials() {
      const directory = yield* temporaryDirectory;
      yield* writePrivateFile(
        path.join(directory, "runtime.env"),
        "APP_AUTH_USERNAME=admin\nAPP_AUTH_PASSWORD=secret\n",
      );
      const result = yield* Effect.result(loadDeploymentAuth(directory));
      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(result.failure.message).not.toContain("secret");
      }
    }).pipe(Effect.scoped),
  );
});
