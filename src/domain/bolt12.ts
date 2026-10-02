import { bech32 } from "@scure/base";

const ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const FIRST_EXTENDED_BIGSIZE = 253;
const BIGSIZE_WIDTHS: Readonly<Record<number, number>> = { 253: 2, 254: 4, 255: 8 };
const BIGSIZE_MINIMUMS: Readonly<Record<number, bigint>> = { 2: 253n, 4: 65_536n, 8: 4_294_967_296n };
const OFFER_PREFIX_LENGTH = 4;
const MAX_OFFER_TYPE = 79;
const MIN_EXPERIMENTAL_OFFER_TYPE = 1_000_000_000;
const MAX_EXPERIMENTAL_OFFER_TYPE = 1_999_999_999;
const ISSUER_ID_TYPE = 22;
const PATHS_TYPE = 16;
const COMPRESSED_PUBKEY_LENGTH = 33;
const EVEN_PUBKEY_PREFIX = 2;
const ODD_PUBKEY_PREFIX = 3;

export function normalizeBolt12Offer(value: string): string {
  return value.replaceAll(/(?<=[023456789acdefghjklmnpqrstuvwxyz])\+\s*(?=[023456789acdefghjklmnpqrstuvwxyz])/giu, "");
}

function readBigSize(bytes: readonly number[], offset: number): readonly [number, number] {
  const first = bytes[offset];
  if (first === undefined) {
    throw new Error("Truncated offer.");
  }
  const size = first < FIRST_EXTENDED_BIGSIZE ? 0 : (BIGSIZE_WIDTHS[first] ?? 0);
  let value = size === 0 ? BigInt(first) : 0n;
  for (let index = 1; index <= size; index += 1) {
    const byte = bytes[offset + index];
    if (byte === undefined) {
      throw new Error("Truncated offer.");
    }
    value = value * 256n + BigInt(byte);
  }
  const minimum = size === 0 ? 0n : BIGSIZE_MINIMUMS[size];
  if (minimum === undefined || value < minimum || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Invalid offer encoding.");
  }
  return [Number(value), offset + size + 1];
}

/** BOLT12 uses bech32's alphabet without a checksum. Bark validates offer semantics before spending. */
export function isBolt12Offer(value: string): boolean {
  const candidate = normalizeBolt12Offer(value);
  if (
    !/^lno1[023456789acdefghjklmnpqrstuvwxyz]+$/iu.test(candidate) ||
    (candidate !== candidate.toLowerCase() && candidate !== candidate.toUpperCase())
  ) {
    return false;
  }
  try {
    const words = Array.from(candidate.slice(OFFER_PREFIX_LENGTH).toLowerCase(), (character) =>
      ALPHABET.indexOf(character),
    );
    const bytes = [...bech32.fromWords(words)];
    let offset = 0;
    let previous = -1;
    let destination = false;
    while (offset < bytes.length) {
      const [type, lengthOffset] = readBigSize(bytes, offset);
      const [length, start] = readBigSize(bytes, lengthOffset);
      const offerType =
        (type >= 1 && type <= MAX_OFFER_TYPE) ||
        (type >= MIN_EXPERIMENTAL_OFFER_TYPE && type <= MAX_EXPERIMENTAL_OFFER_TYPE);
      if (type <= previous || start + length > bytes.length || !offerType) {
        return false;
      }
      if (
        (type === ISSUER_ID_TYPE &&
          length === COMPRESSED_PUBKEY_LENGTH &&
          (bytes[start] === EVEN_PUBKEY_PREFIX || bytes[start] === ODD_PUBKEY_PREFIX)) ||
        (type === PATHS_TYPE && length > 0)
      ) {
        destination = true;
      }
      previous = type;
      offset = start + length;
    }
    return destination;
  } catch {
    return false;
  }
}
