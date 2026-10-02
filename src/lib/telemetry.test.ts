import { describe, expect, it, vi } from "@effect/vitest";
import { Cause, Effect, Exit, Logger } from "effect";

import { observe, remoteParent, telemetryReference } from "./telemetry";
import { telemetryLayer } from "./telemetry-layer";

describe("payment telemetry", () => {
  it.effect("preserves payment failures and logs correlation without serializing their contents", () =>
    Effect.gen(function* test() {
      const logs: string[] = [];
      const logger = Logger.make((options) => {
        logs.push(Logger.formatJson.log(options));
      });
      const secret = new Error("invoice=lnbc-secret mnemonic=private words token=private");
      const result = yield* observe("payout.send", Effect.fail(secret), { paymentHash: "public-hash" }).pipe(
        Effect.provide(Logger.layer([logger])),
        Effect.exit,
      );
      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result)) {
        expect(Cause.squash(result.cause)).toBe(secret);
      }
      expect(logs).toHaveLength(2);
      expect(logs.join("\n")).toContain("operation.failed");
      expect(logs.join("\n")).toContain("traceId");
      expect(logs.join("\n")).toContain("public-hash");
      expect(logs.join("\n")).not.toContain("private");
    }),
  );

  it.effect("exports correlated OTLP logs and nested error spans with sanitized failures and SQL bindings", () =>
    Effect.gen(function* test() {
      const requests: { readonly url: string; readonly body: string }[] = [];
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init): Promise<Response> => {
        const request = new Request(input, init);
        requests.push({ url: request.url, body: await request.text() });
        return Response.json({});
      });
      const parent = remoteParent("00-1234567890abcdef1234567890abcdef-1234567890abcdef-01");
      if (parent === undefined) {
        throw new Error("Expected valid test parent");
      }
      const secret = "secret-invoice-and-preimage";
      const program = observe(
        "settlement.test",
        Effect.fail(new Error(secret)).pipe(
          Effect.withSpan("database.test", { attributes: { "db.query.parameters": secret } }),
        ),
      );
      yield* program.pipe(
        Effect.withParentSpan(parent),
        Effect.exit,
        Effect.provide(telemetryLayer("payments-test", "http://localhost:4318")),
      );
      const traces = requests.filter((request) => request.url.endsWith("/v1/traces"));
      const logs = requests.filter((request) => request.url.endsWith("/v1/logs"));
      expect(traces.length).toBeGreaterThan(0);
      expect(logs.length).toBeGreaterThan(0);
      const payloads = requests.map((request) => request.body).join("\n");
      expect(payloads).toContain("settlement.test");
      expect(payloads).toContain("database.test");
      expect(payloads).toContain("1234567890abcdef1234567890abcdef");
      expect(payloads).toContain("operation_failed");
      expect(payloads).not.toContain(secret);
    }),
  );

  it.effect("does not turn collector outages into payment failures", () =>
    Effect.gen(function* test() {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("collector offline"));
      const result = yield* observe("wallet.test", Effect.succeed(500)).pipe(
        Effect.provide(telemetryLayer("payments-test", "http://localhost:4318")),
      );
      expect(result).toBe(500);
    }),
  );

  it.effect.each([
    undefined,
    "bad",
    "00-00000000000000000000000000000000-1234567890abcdef-01",
    "00-1234567890abcdef1234567890abcdef-0000000000000000-01",
  ])("ignores malformed or zero trace context %s", (header) =>
    Effect.sync(() => {
      expect(remoteParent(header)).toBeUndefined();
    }),
  );

  it.effect("hashes capability references and respects trace sampling", () =>
    Effect.gen(function* test() {
      const reference = yield* Effect.promise(() => telemetryReference("private-invitation"));
      expect(reference).toMatch(/^[a-f0-9]{64}$/u);
      expect(reference).not.toContain("private-invitation");
      expect(remoteParent("00-1234567890abcdef1234567890abcdef-1234567890abcdef-00")?.sampled).toBe(false);
    }),
  );
});
