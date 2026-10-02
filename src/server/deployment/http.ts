import { Database } from "@/db/database";
import type { WalletApi } from "@secondts/barkd";
import { sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { serve } from "srvx";
import type { ServerMiddleware } from "srvx";
import { loadServerEntry } from "srvx/loader";
import { staticMiddleware } from "srvx/static";

import { rejectCrossOriginRequest } from "./http-policy";
import { configuredValue, deploymentIo } from "./state";

const MAXIMUM_PORT = 65_535;
const Port = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAXIMUM_PORT }));
const PORT = Number(process.env["PORT"] ?? "3100");
const HEALTH_TIMEOUT_MS = 3000;
const UNAVAILABLE = 503;
const MAXIMUM_BODY_BYTES = 1_048_576;
const Origin = Schema.String.check(Schema.isPattern(/^https?:\/\/[^/\s]+$/u));

const loadHandler = Effect.fnUntraced(function* loadHandler() {
  const loaded = yield* deploymentIo(
    () => loadServerEntry({ entry: "./dist/server/server.js" }),
    "Could not load the production build. Run pnpm build first.",
  );
  const handler = loaded.fetch;
  if (handler === undefined) {
    return yield* Effect.fail(new Error("Production build does not export a fetch handler."));
  }
  return handler;
});

function securityMiddleware(
  settings: Readonly<{ publicOrigin: string | undefined; health: Effect.Effect<Response> }>,
): ServerMiddleware {
  return async (request, next): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname === "/healthz" && request.method === "GET") {
      return Effect.runPromise(settings.health);
    }
    const rejected = rejectCrossOriginRequest(request, settings.publicOrigin ?? url.origin);
    const original = rejected ?? (await next());
    const response = new Response(original.body, original);
    secureHeaders(response.headers);
    return response;
  };
}

function secureHeaders(headers: Readonly<Headers>): void {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Cache-Control", "private, no-store");
}

export const serveDeployment = Effect.fn("serveDeployment")(function* serveDeployment(
  deployment: Readonly<{ wallet: WalletApi }>,
) {
  const port = yield* Schema.decodeUnknownEffect(Port)(PORT);
  const publicOrigin = configuredValue(process.env["PUBLIC_ORIGIN"]);
  if (publicOrigin !== undefined) {
    yield* Schema.decodeUnknownEffect(Origin)(publicOrigin);
  }
  const handler = yield* loadHandler();
  const database = yield* Database;
  const health = Effect.gen(function* health() {
    yield* database.all(sql`SELECT 1`);
    yield* deploymentIo(
      () => deployment.wallet.walletExists({ signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) }),
      "Receiver unavailable",
    );
    return new Response("ok\n", { headers: { "Cache-Control": "no-store" } });
  }).pipe(Effect.catch(() => Effect.succeed(new Response("unavailable\n", { status: UNAVAILABLE }))));
  yield* Effect.acquireRelease(
    Effect.sync(() =>
      serve({
        port,
        hostname: process.env["HOST"] ?? "0.0.0.0",
        gracefulShutdown: false,
        maxRequestBodySize: MAXIMUM_BODY_BYTES,
        middleware: [
          securityMiddleware({ publicOrigin, health }),
          staticMiddleware({ dir: "./dist/client", dotfiles: false }),
        ],
        // Use the configured origin, not user-supplied forwarded headers, for SSR and secure cookies.
        fetch: (request) => {
          if (publicOrigin === undefined) {
            return handler(request);
          }
          const url = new URL(request.url);
          return handler(new Request(`${publicOrigin}${url.pathname}${url.search}`, request));
        },
      }),
    ),
    (server) =>
      Effect.promise(() => server.close()).pipe(
        Effect.timeout("45 seconds"),
        Effect.catch(() => Effect.promise(() => server.close(true))),
      ),
  ).pipe(Effect.tap((server) => deploymentIo(() => server.ready(), "Could not start HTTP server.")));
  return yield* Effect.void;
});
