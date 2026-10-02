import { observe, traceparent } from "@/lib/telemetry";
import type { TelemetryFields } from "@/lib/telemetry";
import { telemetryLayer } from "@/lib/telemetry-layer";
import { Cause, Effect, Exit, ManagedRuntime, Schema, Tracer } from "effect";

const runtime = ManagedRuntime.make(
  telemetryLayer(
    "payments-browser",
    Schema.decodeUnknownSync(Schema.UndefinedOr(Schema.String))(import.meta.env["VITE_OTEL_EXPORTER_OTLP_ENDPOINT"]),
  ),
);

export interface BrowserTrace {
  readonly headers: Readonly<Record<string, string>>;
  readonly step: <Value>(name: string, fields: TelemetryFields, run: () => Promise<Value>) => Promise<Value>;
  readonly log: (event: string, fields: TelemetryFields) => Promise<void>;
}

async function runObserved<Value>(effect: Effect.Effect<Value, unknown>): Promise<Value> {
  const exit = await runtime.runPromiseExit(effect);
  if (Exit.isFailure(exit)) {
    throw Cause.squash(exit.cause);
  }
  return exit.value;
}

function context(ids: Pick<Tracer.AnySpan, "traceId" | "spanId" | "sampled">): BrowserTrace {
  const span = Tracer.externalSpan(ids);
  return {
    headers: { traceparent: traceparent(span) },
    step: (name, fields, run) =>
      runObserved(
        observe(name, Effect.tryPromise({ try: run, catch: (error) => error }), fields).pipe(
          Effect.withParentSpan(span),
        ),
      ),
    log: (event, fields) =>
      runtime.runPromise(
        Effect.logInfo(event).pipe(
          Effect.annotateLogs({ ...fields, traceId: span.traceId, spanId: span.spanId, side: "browser" }),
        ),
      ),
  };
}

export function browserOperation<Value>(name: string, run: (trace: BrowserTrace) => Promise<Value>): Promise<Value> {
  return runObserved(
    observe(
      name,
      Effect.gen(function* browserTask() {
        const span = yield* Tracer.ParentSpan;
        return yield* Effect.tryPromise({ try: () => run(context(span)), catch: (error) => error });
      }),
      { side: "browser" },
    ),
  );
}

if (import.meta.hot !== undefined) {
  import.meta.hot.dispose(() => {
    runtime.dispose().catch(() => null);
  });
}
