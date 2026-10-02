import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { authorizeRequest } from "./http-policy";

const auth = { username: "admin", password: "long_generated_test_password_123456" };
const origin = "https://payments.example.com";
const authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`;

describe("deployment HTTP security", () => {
  it.effect.each(["/", "/settle", "/_serverFn/arbitrary", "/assets/app.js", "/.env"])(
    "requires credentials before routing %s",
    (pathname) =>
      Effect.sync(() => {
        const rejected = authorizeRequest(new Request(`${origin}${pathname}`), auth, origin);
        expect(rejected?.status).toBe(401);
        expect(rejected?.headers.get("www-authenticate")).toContain("Basic");
        expect(rejected?.headers.get("cache-control")).toBe("no-store");
      }),
  );

  it.effect.each(["", "Bearer invalid", "Basic invalid", `Basic ${Buffer.from("admin:wrong").toString("base64")}`])(
    "rejects incorrect credentials %s",
    (supplied) =>
      Effect.sync(() => {
        const request = new Request(origin, { headers: { authorization: supplied } });
        expect(authorizeRequest(request, auth, origin)?.status).toBe(401);
      }),
  );

  it.effect("accepts authenticated same-origin actions", () =>
    Effect.sync(() => {
      const request = new Request(`${origin}/_serverFn/action`, {
        method: "POST",
        headers: { authorization, origin, "sec-fetch-site": "same-origin" },
      });
      expect(authorizeRequest(request, auth, origin)).toBeUndefined();
    }),
  );

  it.effect("accepts authenticated non-browser clients", () =>
    Effect.sync(() => {
      const request = new Request(origin, { method: "POST", headers: { authorization } });
      expect(authorizeRequest(request, auth, origin)).toBeUndefined();
    }),
  );

  it.effect.each(["https://attacker.example", "null", "https://payments.example.com.attacker.example"])(
    "rejects cross-origin authenticated actions from %s",
    (suppliedOrigin) =>
      Effect.sync(() => {
        const request = new Request(origin, { method: "POST", headers: { authorization, origin: suppliedOrigin } });
        expect(authorizeRequest(request, auth, origin)?.status).toBe(403);
      }),
  );

  it.effect("rejects cross-site actions even without an Origin header", () =>
    Effect.sync(() => {
      const request = new Request(origin, {
        method: "POST",
        headers: { authorization, "sec-fetch-site": "cross-site" },
      });
      expect(authorizeRequest(request, auth, origin)?.status).toBe(403);
    }),
  );
});
