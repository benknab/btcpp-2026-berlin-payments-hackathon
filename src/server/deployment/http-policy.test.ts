import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { rejectCrossOriginRequest } from "./http-policy";

const origin = "https://payments.example.com";

describe("deployment HTTP security", () => {
  it.effect.each(["/", "/groups/invitation", "/_serverFn/arbitrary", "/assets/app.js"])(
    "allows public reads without a shared login: %s",
    (pathname) =>
      Effect.sync(() => {
        expect(rejectCrossOriginRequest(new Request(`${origin}${pathname}`), origin)).toBeUndefined();
      }),
  );

  it.effect("accepts same-origin actions without Basic authentication", () =>
    Effect.sync(() => {
      const request = new Request(`${origin}/_serverFn/action`, {
        method: "POST",
        headers: { origin, "sec-fetch-site": "same-origin" },
      });
      expect(rejectCrossOriginRequest(request, origin)).toBeUndefined();
    }),
  );

  it.effect("accepts non-browser clients without an Origin header", () =>
    Effect.sync(() => {
      expect(rejectCrossOriginRequest(new Request(origin, { method: "POST" }), origin)).toBeUndefined();
    }),
  );

  it.effect.each(["POST", "PUT", "PATCH", "DELETE"])("checks the origin for %s actions", (method) =>
    Effect.sync(() => {
      const request = new Request(origin, { method, headers: { origin: "https://attacker.example" } });
      expect(rejectCrossOriginRequest(request, origin)?.status).toBe(403);
    }),
  );

  it.effect.each(["https://attacker.example", "null", "https://payments.example.com.attacker.example"])(
    "rejects actions from %s",
    (suppliedOrigin) =>
      Effect.sync(() => {
        const request = new Request(origin, { method: "POST", headers: { origin: suppliedOrigin } });
        expect(rejectCrossOriginRequest(request, origin)?.status).toBe(403);
      }),
  );

  it.effect("rejects cross-site actions even without an Origin header", () =>
    Effect.sync(() => {
      const request = new Request(origin, { method: "POST", headers: { "sec-fetch-site": "cross-site" } });
      expect(rejectCrossOriginRequest(request, origin)?.status).toBe(403);
    }),
  );
});
