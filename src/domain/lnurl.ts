import { bech32 } from "@scure/base";
import { Schema } from "effect";

export const MAX_LNURL_LENGTH = 2048;
export const LNURL_ERROR = "Enter a valid Lightning address or HTTPS LNURL.";

const LIGHTNING_ADDRESS = /^[a-z\d._+-]+@(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/u;

/** Validates encoding and destination syntax, not the remote service's availability or LNURL-pay support. */
export function isLnurl(value: string): boolean {
  if (value.length > MAX_LNURL_LENGTH || value !== value.trim()) {
    return false;
  }
  const candidate = value.replace(/^lightning:/iu, "");
  if (LIGHTNING_ADDRESS.test(candidate)) {
    return true;
  }
  try {
    const decoded = bech32.decodeToBytes(candidate, MAX_LNURL_LENGTH);
    if (decoded.prefix !== "lnurl") {
      return false;
    }
    const destination = new TextDecoder("utf-8", { fatal: true }).decode(decoded.bytes);
    const url = new URL(destination);
    return (
      destination.startsWith("https://") &&
      !/\s/u.test(destination) &&
      url.protocol === "https:" &&
      url.hostname.length > 0 &&
      url.username === "" &&
      url.password === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

export const Lnurl = Schema.String.pipe(Schema.check(Schema.makeFilter((value) => isLnurl(value) || LNURL_ERROR)));
