import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { observe, remoteParent } from "@/lib/telemetry";
import type { TelemetryFields } from "@/lib/telemetry";
import { telemetryLayer } from "@/lib/telemetry-layer";
import { NodeFileSystem } from "@effect/platform-node";
import { getRequestHeader } from "@tanstack/react-start/server";
import { Effect, Layer, Logger, ManagedRuntime } from "effect";

import { withServerConfiguration } from "./configuration";

const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;
const logDirectory = process.env["PAYMENTS_LOG_DIR"] ?? path.join(homedir(), ".local/share/bark-payments-mainnet/logs");
const fileLogger = Logger.layer(
  [
    Effect.gen(function* paymentLog() {
      yield* Effect.tryPromise(() => mkdir(logDirectory, { recursive: true, mode: DIRECTORY_MODE }));
      return yield* Logger.toFile(Logger.formatJson, path.join(logDirectory, "server.jsonl"), {
        mode: FILE_MODE,
        batchWindow: "250 millis",
      });
    }).pipe(Effect.orElseSucceed(() => Logger.consoleJson)),
  ],
  { mergeWithExisting: true },
).pipe(Layer.provide(NodeFileSystem.layer));

const runtime = ManagedRuntime.make(
  fileLogger.pipe(
    Layer.provideMerge(
      telemetryLayer(process.env["OTEL_SERVICE_NAME"] ?? "payments-server", process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]),
    ),
  ),
);

export function runServer<Value, Failure>(
  name: string,
  effect: Effect.Effect<Value, Failure>,
  fields: TelemetryFields = {},
): Promise<Value> {
  const parent = remoteParent(getRequestHeader("traceparent"));
  const request = observe(name, effect, { ...fields, requestId: crypto.randomUUID(), side: "server" });
  const traced = parent === undefined ? request : request.pipe(Effect.withParentSpan(parent));
  return runtime.runPromise(withServerConfiguration(traced));
}

if (import.meta.hot !== undefined) {
  import.meta.hot.dispose(() => {
    runtime.dispose().catch(() => null);
  });
}
