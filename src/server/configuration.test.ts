import { describe, expect, it, vi } from "@effect/vitest";
import { Config, ConfigProvider, Effect, Exit, Redacted } from "effect";

import { Receiver, ReceiverLive } from "./bark/receiver";
import { withServerConfiguration } from "./configuration";

describe("server runtime configuration", () => {
  it.effect("reads credentials injected after the startup environment was cached", () =>
    Effect.gen(function* lateCredentials() {
      const environment: Record<string, string | undefined> = { DATABASE_URL: "file:/data/mainnet.db" };
      const startup = ConfigProvider.fromEnvRecord({ ...environment });
      const readConfiguration = Effect.gen(function* configuration() {
        return {
          url: yield* Config.String("BARK_RECEIVER_URL"),
          token: yield* Config.Redacted("BARK_RECEIVER_TOKEN"),
          database: yield* Config.String("DATABASE_URL"),
        };
      });
      const missing = yield* readConfiguration.pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, startup),
        Effect.exit,
      );
      expect(Exit.isFailure(missing)).toBe(true);

      environment["BARK_RECEIVER_URL"] = "http://127.0.0.1:3042";
      environment["BARK_RECEIVER_TOKEN"] = "private-receiver-token";
      const request = withServerConfiguration(readConfiguration, environment).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, startup),
      );
      const configured = yield* request;
      expect(configured.url).toBe("http://127.0.0.1:3042");
      expect(Redacted.value(configured.token)).toBe("private-receiver-token");
      expect(configured.database).toBe("file:/data/mainnet.db");

      environment["BARK_RECEIVER_TOKEN"] = "replacement-receiver-token";
      expect(Redacted.value((yield* request).token)).toBe("replacement-receiver-token");
    }),
  );

  it.effect("builds the receiver layer with late credentials and authenticates its API requests", () =>
    Effect.gen(function* receiverCredentials() {
      const environment: Record<string, string | undefined> = {};
      const startup = ConfigProvider.fromEnvRecord({ ...environment });
      const requests: Request[] = [];
      vi.spyOn(globalThis, "fetch").mockImplementation((input, init): Promise<Response> => {
        requests.push(new Request(input, init));
        return Promise.resolve(
          Response.json({
            payment_hash: "public-hash",
            amount_sat: 500,
            state: "awaiting-payment",
            htlc_vtxos: [],
            htlc_vtxo_ids: [],
            invoice: "unused-test-invoice",
          }),
        );
      });
      const receipt = Effect.gen(function* receiverReceipt() {
        return yield* (yield* Receiver).receipt("public-hash");
      }).pipe(Effect.provide(ReceiverLive));
      const request = withServerConfiguration(receipt, environment).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, startup),
      );

      // Simulate the entrypoint injecting credentials after the request effect was constructed.
      environment["BARK_RECEIVER_URL"] = "http://127.0.0.1:3042";
      environment["BARK_RECEIVER_TOKEN"] = "private-receiver-token";
      expect(yield* request).toStrictEqual({ paymentHash: "public-hash", amountSat: 500, state: "awaiting-payment" });
      expect(requests).toHaveLength(1);
      expect(requests[0]?.url).toContain("http://127.0.0.1:3042/");
      expect(requests[0]?.headers.get("authorization")).toBe("Bearer private-receiver-token");
    }),
  );
});
