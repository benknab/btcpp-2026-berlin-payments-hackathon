import { DatabaseLive } from "@/db/database";
import { initializeDeployment } from "@/server/deployment/bootstrap";
import { serveDeployment } from "@/server/deployment/http";
import { prepareDirectory, requireOriginalData } from "@/server/deployment/state";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Logger, Schema } from "effect";

const PRIVATE_UMASK = 0o077;
const ProductionLogger = Logger.layer([Logger.consoleJson]);
process.umask(PRIVATE_UMASK);

const production = Effect.gen(function* production() {
  const deployment = yield* initializeDeployment();
  yield* serveDeployment(deployment);
  yield* Effect.logInfo("Deployment ready; login credentials are in /data/runtime.env (not printed to logs).");
  const code = yield* deployment.daemon.exitCode;
  return yield* Effect.fail(new Error(`Receiving Barkd exited (${code}); restarting the entire deployment.`));
});

// Check before constructing the DB layer: libSQL would otherwise create an empty replacement file.
const guardedProduction = Effect.gen(function* guardedProduction() {
  yield* Schema.decodeUnknownEffect(Schema.Literal("file:/data/mainnet.db"))(process.env["DATABASE_URL"]).pipe(
    Effect.mapError(
      () => new Error("This entrypoint requires DATABASE_URL=file:/data/mainnet.db; use the Docker image."),
    ),
  );
  yield* prepareDirectory("/data");
  yield* requireOriginalData("/data", "mainnet.db");
  yield* requireOriginalData("/data", "receiver/db.sqlite");
  yield* requireOriginalData("/data", "runtime.env");
  return yield* production.pipe(Effect.provide(DatabaseLive));
});

NodeRuntime.runMain(
  guardedProduction.pipe(Effect.scoped, Effect.provide(NodeServices.layer), Effect.provide(ProductionLogger)),
);
