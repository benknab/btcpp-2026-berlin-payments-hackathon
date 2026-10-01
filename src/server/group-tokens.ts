import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export function newToken(): string {
  const TOKEN_BYTES = 32;
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function newId(): string {
  return randomUUID();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifiesToken(token: string | undefined, expectedHash: string): boolean {
  if (token === undefined) {
    return false;
  }
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
