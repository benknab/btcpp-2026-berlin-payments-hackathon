const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const FORBIDDEN = 403;

export function rejectCrossOriginRequest(request: Readonly<Request>, origin: string): Response | undefined {
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
