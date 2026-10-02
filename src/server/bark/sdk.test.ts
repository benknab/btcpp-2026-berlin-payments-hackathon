import { describe, expect, it, vi } from "@effect/vitest";
import { Effect, Redacted } from "effect";

import { makeBark } from "./sdk";
import type { BarkError } from "./service";

function response(body: unknown): Response {
  return Response.json(body);
}

const config = { basePath: "http://127.0.0.1:3031", token: Redacted.make("test-token") };

describe("Bark TypeScript SDK Effect adapter", (): void => {
  it.effect("authenticates and validates camelCase SDK responses", (): Effect.Effect<void, BarkError> =>
    Effect.gen(function* test() {
      const fetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(response({ address: "ark1ace" }))
        .mockResolvedValueOnce(response({ spendable_sat: 9000 }));
      const bark = makeBark(config);
      expect(yield* bark.address()).toBe("ark1ace");
      expect(yield* bark.balance()).toBe(9000);
      expect(fetch.mock.calls[0]?.[0]).toBe("http://127.0.0.1:3031/api/v1/wallet/addresses/next");
      expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer test-token" });
      expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    }),
  );

  it.effect("decodes Bark receipt history without retaining unsafe SDK metadata", (): Effect.Effect<void, BarkError> =>
    Effect.gen(function* test() {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        response([
          {
            id: 1,
            status: "successful",
            received_on: [{ amount_sat: 5000, destination: { type: "ark", value: "ark1ace" } }],
            sent_to: [],
            metadata: { ignored: "untrusted metadata" },
          },
        ]),
      );
      expect(yield* makeBark(config).history()).toStrictEqual([
        {
          id: 1,
          status: "successful",
          receivedOn: [{ amountSat: 5000, destination: { type: "ark", value: "ark1ace" } }],
          sentTo: [],
        },
      ]);
    }),
  );

  it.effect("checks mainnet and sends integer sats through the SDK", (): Effect.Effect<void, BarkError> =>
    Effect.gen(function* test() {
      const fetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(response({ network: "bitcoin" }))
        .mockResolvedValueOnce(response({ message: "Payment sent" }));
      yield* makeBark(config).send("ark1ace", 5000);
      expect(fetch.mock.calls[1]?.[0]).toBe("http://127.0.0.1:3031/api/v1/wallet/send");
      expect(fetch.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ amount_sat: 5000, destination: "ark1ace" }));
    }),
  );

  it.effect("rejects signet before sending", (): Effect.Effect<void> =>
    Effect.gen(function* test() {
      const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ network: "signet" }));
      expect(yield* Effect.result(makeBark(config).send("ark1ace", 5000))).toMatchObject({ _tag: "Failure" });
      expect(fetch).toHaveBeenCalledTimes(1);
    }),
  );

  it.effect.each([1.5, -1, Number.MAX_SAFE_INTEGER + 1])(
    "rejects unsafe SDK balances %s",
    (spendableSat): Effect.Effect<void> =>
      Effect.gen(function* test() {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ spendable_sat: spendableSat }));
        expect(yield* Effect.result(makeBark(config).balance())).toMatchObject({ _tag: "Failure" });
      }),
  );

  it.effect("returns sanitized typed HTTP failures without credentials", (): Effect.Effect<void> =>
    Effect.gen(function* test() {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("secret details", { status: 401 }));
      const result = yield* Effect.result(makeBark(config).balance());
      expect(result).toMatchObject({
        _tag: "Failure",
        failure: { _tag: "BarkError", operation: "balance", message: "Bark HTTP 401" },
      });
    }),
  );
});
