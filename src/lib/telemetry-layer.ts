import { Effect, Exit, Layer, Logger, References, Tracer } from "effect";
import { FetchHttpClient } from "effect/http";
import { Otlp } from "effect/observability";

import { failureKind } from "./telemetry";

/** SQL/SDK failures can embed credentials, invoices, or bindings in their cause. */
type SpanOptions = Omit<Parameters<Tracer.Tracer["span"]>[0], "links"> & { readonly links: readonly Tracer.SpanLink[] };

export function sanitizedTracer(tracer: Readonly<Tracer.Tracer>): Tracer.Tracer {
  return Tracer.make({
    span(options: SpanOptions) {
      const span = tracer.span({ ...options, links: [...options.links] });
      const end = span.end.bind(span);
      span.end = (time: bigint, exit: Exit.Exit<unknown, unknown>): void => {
        // Query text and bindings are unnecessary for diagnosing payment state transitions.
        for (const key of span.attributes.keys()) {
          if (/db\.|sql\.|query|statement|parameter|body|header|token|invoice|preimage|mnemonic/iu.test(key)) {
            span.attribute(key, "[REDACTED]");
          }
        }
        end(time, Exit.isFailure(exit) ? Exit.fail(failureKind(exit.cause)) : Exit.void);
      };
      return span;
    },
    context: tracer.context,
  });
}

export function telemetryLayer(serviceName: string, endpoint: string | undefined): Layer.Layer<never> {
  const logging = Logger.layer([Logger.consoleJson]);
  const exporters =
    endpoint === undefined || endpoint.length === 0
      ? Layer.empty
      : Otlp.layerJson({
          baseUrl: endpoint.replace(/\/$/u, ""),
          resource: {
            serviceName,
            attributes: { "deployment.environment.name": "development", "bitcoin.network": "mainnet" },
          },
          loggerMergeWithExisting: true,
          loggerExportInterval: "1 second",
          tracerExportInterval: "1 second",
          metricsExportInterval: "10 seconds",
          shutdownTimeout: "2 seconds",
        }).pipe(Layer.provide(FetchHttpClient.layer));
  const safeTracer = Layer.effect(
    Tracer.Tracer,
    Effect.gen(function* safeTracer() {
      return sanitizedTracer(yield* Tracer.Tracer);
    }),
  );
  return safeTracer.pipe(
    Layer.provideMerge(exporters.pipe(Layer.provideMerge(logging))),
    Layer.provideMerge(Layer.succeed(References.MinimumLogLevel, "Debug")),
  );
}
