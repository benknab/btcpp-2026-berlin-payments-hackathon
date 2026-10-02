import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const url = process.env["DATABASE_URL"] ?? "file:mainnet.db";
if (!url.startsWith("file:") || url === "file::memory:") {
  throw new Error("db:reset requires a local file: DATABASE_URL.");
}
const path = url.startsWith("file://") ? fileURLToPath(url) : url.slice("file:".length);
if (path.length === 0) {
  throw new Error("DATABASE_URL must name a local SQLite file.");
}
await Promise.all(
  ["", "-shm", "-wal", "-journal"].map((suffix): Promise<void> => rm(`${path}${suffix}`, { force: true })),
);
