import { env } from "node:process";

const TIMEOUT_MS = 5000;
const OK = 200;
const response = await fetch(`http://127.0.0.1:${env["PORT"] ?? "3100"}/healthz`, {
  signal: AbortSignal.timeout(TIMEOUT_MS),
}).catch(() => null);

if (response?.status !== OK) {
  process.exitCode = 1;
}
