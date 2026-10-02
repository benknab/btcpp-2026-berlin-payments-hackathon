import { describe, expect, it, vi } from "@effect/vitest";
import { Effect, Redacted } from "effect";

import { barkLayer } from "./sdk";
import { generateTestAddresses } from "./test-addresses";

const wallet = barkLayer({ basePath: "http://127.0.0.1:3031", token: Redacted.make("test-token") });

describe("participant test addresses", () => {
  it.effect("allocates one fresh address per participant without spending or creating wallets", () =>
    Effect.gen(function* test() {
      const fetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({ network: "signet" }))
        .mockResolvedValueOnce(Response.json({ fingerprint: "shared-test-wallet" }))
        .mockResolvedValueOnce(Response.json({ address: "tark1ace" }))
        .mockResolvedValueOnce(Response.json({ address: "tark1q0q" }));
      expect(yield* generateTestAddresses(2)).toStrictEqual(["tark1ace", "tark1q0q"]);
      expect(fetch).toHaveBeenCalledTimes(4);
      expect(fetch.mock.calls[0]?.[0]).toBe("http://127.0.0.1:3031/api/v1/wallet/ark-info");
      expect(fetch.mock.calls[1]?.[0]).toBe("http://127.0.0.1:3031/api/v1/wallet");
      expect(fetch.mock.calls[2]?.[0]).toBe("http://127.0.0.1:3031/api/v1/wallet/addresses/next");
      expect(fetch.mock.calls[3]?.[0]).toBe("http://127.0.0.1:3031/api/v1/wallet/addresses/next");
    }).pipe(Effect.provide(wallet)),
  );

  it.effect("refuses a non-signet wallet before generating addresses", () =>
    Effect.gen(function* test() {
      const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ network: "bitcoin" }));
      expect((yield* Effect.result(generateTestAddresses(2)))._tag).toBe("Failure");
      expect(fetch).toHaveBeenCalledTimes(1);
    }).pipe(Effect.provide(wallet)),
  );

  it.effect.each([0, -1, 1.5, 101])("rejects invalid participant counts %s before accessing Bark", (count) =>
    Effect.gen(function* test() {
      const fetch = vi.spyOn(globalThis, "fetch");
      expect((yield* Effect.result(generateTestAddresses(count)))._tag).toBe("Failure");
      expect(fetch).not.toHaveBeenCalled();
    }).pipe(Effect.provide(wallet)),
  );

  it.effect("fails cleanly when the signet daemon is unavailable", () =>
    Effect.gen(function* test() {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Connection refused"));
      expect(yield* Effect.result(generateTestAddresses(1))).toMatchObject({
        _tag: "Failure",
        failure: { _tag: "BarkError" },
      });
    }).pipe(Effect.provide(wallet)),
  );
});
