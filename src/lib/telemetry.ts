import { Cause, Clock, Effect, Exit, Metric, Schema, Tracer } from "effect";

export type TelemetryFields = Readonly<Record<string, string | number | boolean>>;
const ErrorTag = Schema.Struct({ _tag: Schema.String });
const BrowserError = Schema.Struct({
  name: Schema.Literals([
    "TypeError",
    "TimeoutError",
    "AbortError",
    "NetworkError",
    "QuotaExceededError",
    "SecurityError",
  ]),
});
const ERROR_KINDS = new Set([
  "BarkError",
  "GroupError",
  "PotError",
  "ExpenseError",
  "SchemaError",
  "SqlError",
  "PaymentError",
]);
const operations = Metric.counter("payments.operations");
const LATENCY_START_MS = 10;
const LATENCY_FACTOR = 10;
const LATENCY_BUCKET_COUNT = 5;
const HEX_RADIX = 16;
const HEX_BYTE_WIDTH = 2;
const duration = Metric.histogram("payments.operation.duration", {
  boundaries: Metric.exponentialBoundaries({
    start: LATENCY_START_MS,
    factor: LATENCY_FACTOR,
    count: LATENCY_BUCKET_COUNT,
  }),
});

export function failureKind(cause: Cause.Cause<unknown>): string {
  if (Cause.hasInterruptsOnly(cause)) {
    return "interrupted";
  }
  const error = Cause.squash(cause);
  if (Schema.is(ErrorTag)(error) && ERROR_KINDS.has(error._tag)) {
    return error._tag;
  }
  if (Schema.is(BrowserError)(error)) {
    return error.name;
  }
  return Cause.hasDies(cause) ? "defect" : "operation_failed";
}

/** Only identifiers and explicit diagnostic fields belong here, never request/response objects. */
export function observe<Value, Failure, Requirements>(
  name: string,
  effect: Effect.Effect<Value, Failure, Requirements>,
  fields: TelemetryFields = {},
): Effect.Effect<Value, Failure, Exclude<Requirements, Tracer.ParentSpan>> {
  return Effect.gen(function* observed() {
    const span = yield* Tracer.ParentSpan;
    const started = yield* Clock.currentTimeMillis;
    yield* Effect.logInfo("operation.started").pipe(
      Effect.annotateLogs({ traceId: span.traceId, spanId: span.spanId }),
    );
    return yield* effect.pipe(
      Effect.onExit((exit) =>
        Effect.gen(function* completed() {
          const durationMs = (yield* Clock.currentTimeMillis) - started;
          const outcome = Exit.isSuccess(exit) ? "success" : failureKind(exit.cause);
          yield* Metric.update(Metric.withAttributes(operations, { operation: name, outcome }), 1);
          yield* Metric.update(Metric.withAttributes(duration, { operation: name, outcome }), durationMs);
          const details = { durationMs, outcome, traceId: span.traceId, spanId: span.spanId };
          yield* (
            Exit.isSuccess(exit) ? Effect.logInfo("operation.completed") : Effect.logError("operation.failed")
          ).pipe(Effect.annotateLogs(details));
        }),
      ),
      Effect.annotateLogs({ traceId: span.traceId, spanId: span.spanId }),
    );
  }).pipe(
    Effect.withSpan(name, { attributes: { ...fields, operation: name } }),
    Effect.annotateLogs({ ...fields, operation: name, network: "mainnet" }),
  );
}

export function traceparent(span: Pick<Tracer.AnySpan, "traceId" | "spanId" | "sampled">): string {
  return `00-${span.traceId}-${span.spanId}-${span.sampled ? "01" : "00"}`;
}

export async function telemetryReference(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(HEX_RADIX).padStart(HEX_BYTE_WIDTH, "0")).join("");
}

const TRACEPARENT = /^00-(?<traceId>[0-9a-f]{32})-(?<spanId>[0-9a-f]{16})-(?<flags>[0-9a-f]{2})$/u;
const SAMPLED_FLAG_DIVISOR = 2;

export function remoteParent(header: string | undefined): Tracer.ExternalSpan | undefined {
  const match = header?.match(TRACEPARENT);
  const traceId = match?.groups?.["traceId"];
  const spanId = match?.groups?.["spanId"];
  if (traceId === undefined || spanId === undefined || /^0+$/u.test(traceId) || /^0+$/u.test(spanId)) {
    return undefined;
  }
  const flags = Number.parseInt(match?.groups?.["flags"] ?? "00", HEX_RADIX);
  return Tracer.externalSpan({ traceId, spanId, sampled: flags % SAMPLED_FLAG_DIVISOR === 1 });
}
