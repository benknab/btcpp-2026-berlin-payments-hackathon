import { bech32 } from "@scure/base";
import { Schema } from "effect";

export const MAX_LNURL_LENGTH = 2048;
export const LNURL_ERROR = "Enter a valid Lightning address or HTTPS LNURL.";
export const DUPLICATE_LNURL_ERROR = "Each participant needs a different LNURL or Lightning address.";

const LIGHTNING_ADDRESS = /^[a-z\d._+-]+@(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/u;

/** Resolves syntax locally without contacting the receiving service. */
function lnurlEndpoint(value: string): string | null {
  if (value.length > MAX_LNURL_LENGTH || value !== value.trim()) {
    return null;
  }
  const candidate = value.replace(/^lightning:/iu, "");
  try {
    if (LIGHTNING_ADDRESS.test(candidate)) {
      const separator = candidate.indexOf("@");
      const username = candidate.slice(0, separator);
      const domain = candidate.slice(separator + 1);
      return new URL(`https://${domain}/.well-known/lnurlp/${encodeURIComponent(username)}`).href;
    }
    const decoded = bech32.decodeToBytes(candidate, MAX_LNURL_LENGTH);
    if (decoded.prefix !== "lnurl") {
      return null;
    }
    const destination = new TextDecoder("utf-8", { fatal: true }).decode(decoded.bytes);
    const url = new URL(destination);
    const valid =
      destination.startsWith("https://") &&
      !/\s/u.test(destination) &&
      url.protocol === "https:" &&
      url.hostname.length > 0 &&
      url.username === "" &&
      url.password === "" &&
      url.hash === "";
    return valid ? url.href : null;
  } catch {
    return null;
  }
}

/** Validates encoding and destination syntax, not the remote service's availability or LNURL-pay support. */
export function isLnurl(value: string): boolean {
  return lnurlEndpoint(value) !== null;
}

export function hasUniqueLnurls(values: readonly (string | null)[]): boolean {
  const endpoints = values.flatMap((value) => {
    const endpoint = value === null ? null : lnurlEndpoint(value);
    return endpoint === null ? [] : [endpoint];
  });
  return new Set(endpoints).size === endpoints.length;
}

export const Lnurl = Schema.String.pipe(Schema.check(Schema.makeFilter((value) => isLnurl(value) || LNURL_ERROR)));
