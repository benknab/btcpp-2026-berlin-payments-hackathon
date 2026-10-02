import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import { defineConfig } from "drizzle-kit";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "file:mainnet.db",
    ...(process.env["DATABASE_AUTH_TOKEN"] === undefined ? {} : { authToken: process.env["DATABASE_AUTH_TOKEN"] }),
  },
  verbose: true,
});
