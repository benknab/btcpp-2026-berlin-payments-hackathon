import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

export function loadEnvironment(): void {
  if (existsSync(".env")) {
    loadEnvFile(".env");
  }
}
