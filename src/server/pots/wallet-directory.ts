import { createHash } from "node:crypto";
import { mkdir, rmdir } from "node:fs/promises";
import { createServer } from "node:net";
import { homedir } from "node:os";
import path from "node:path";

import { PotError } from "@/lib/pot";
import { Effect } from "effect";

const DATABASE_NAMESPACE_LENGTH = 16;

export function potWalletDirectory(id: number): string {
  const url = process.env["DATABASE_URL"] ?? "file:local.db";
  const database = url.startsWith("file:") ? path.resolve(url.slice("file:".length)) : url;
  const namespace = createHash("sha256").update(database).digest("hex").slice(0, DATABASE_NAMESPACE_LENGTH);
  const root = process.env["BARK_POTS_DATADIR"] ?? path.join(homedir(), ".local", "share", "bark-settlement-pots");
  return path.resolve(root, namespace, String(id));
}

export function walletIo<Value>(run: () => Promise<Value>, message: string): Effect.Effect<Value, PotError> {
  return Effect.tryPromise({ try: run, catch: (): PotError => new PotError({ message }) });
}

function availablePort(): Promise<number> {
  return new Promise((resolve, reject): void => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", (): void => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a loopback port"));
        return;
      }
      server.close((error: Readonly<Error> | undefined): void => {
        if (error === undefined) {
          resolve(address.port);
        } else {
          reject(error);
        }
      });
    });
  });
}

export const prepareWalletDirectory = Effect.fn("prepareWalletDirectory")(function* prepareWalletDirectory(id: number) {
  const datadir = potWalletDirectory(id);
  yield* walletIo(() => mkdir(datadir, { recursive: true, mode: 0o700 }), "Could not open the pot wallet directory");
  const lock = `${datadir}.lock`;
  yield* Effect.acquireRelease(
    walletIo(() => mkdir(lock, { mode: 0o700 }), "This pot wallet is busy. Wait for the current request to finish"),
    () => walletIo(() => rmdir(lock), "Could not release the pot wallet lock").pipe(Effect.orDie),
  );
  const port = yield* walletIo(availablePort, "Could not start the pot wallet");
  return { datadir, port };
});
