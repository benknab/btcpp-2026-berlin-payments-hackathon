import { createHash, timingSafeEqual } from "node:crypto";

import type { DeploymentAuth } from "./state";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function authorizeRequest(
  request: Readonly<Request>,
  auth: DeploymentAuth,
  origin: string,
): Response | undefined {
  const expected = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`;
  const supplied = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(digest(expected), digest(supplied))) {
    return new Response("Authentication required", {
      status: UNAUTHORIZED,
      headers: { "WWW-Authenticate": 'Basic realm="Bark payments", charset="UTF-8"', "Cache-Control": "no-store" },
    });
  }
  if (!SAFE_METHODS.has(request.method)) {
    const suppliedOrigin = request.headers.get("origin");
    if (
      request.headers.get("sec-fetch-site") === "cross-site" ||
      (suppliedOrigin !== null && suppliedOrigin !== origin)
    ) {
      return new Response("Cross-origin request rejected", { status: FORBIDDEN });
    }
  }
  return undefined;
}
