import { bech32m } from "@scure/base";
import { Schema } from "effect";

import { isBolt12Offer, normalizeBolt12Offer } from "./bolt12";
import { lnurlEndpoint } from "./lnurl";

export const MAX_PAYOUT_DESTINATION_LENGTH = 10_000;
export const PAYOUT_DESTINATION_ERROR = "Enter a Lightning address, LNURL, Bark signet address, or BOLT12 offer.";
export const DUPLICATE_PAYOUT_DESTINATION_ERROR = "Each participant needs a different receiving address.";
const MIN_ARK_PAYLOAD_LENGTH = 39;

export type PayoutDestination = Readonly<{ kind: "lnurl" | "ark" | "bolt12"; value: string }>;

function isSignetArkAddress(value: string): boolean {
  try {
    const decoded = bech32m.decode(value, MAX_PAYOUT_DESTINATION_LENGTH);
    // Bark policy addresses use version 1, followed by server ID and a serialized VTXO policy.
    return (
      decoded.prefix === "tark" &&
      decoded.words[0] === 1 &&
      bech32m.fromWords(decoded.words.slice(1)).length >= MIN_ARK_PAYLOAD_LENGTH
    );
  } catch {
    return false;
  }
}

export function payoutDestination(value: string): PayoutDestination | null {
  if (value !== value.trim() || value.length > MAX_PAYOUT_DESTINATION_LENGTH) {
    return null;
  }
  const candidate = value.replace(/^lightning:/iu, "");
  if (isSignetArkAddress(candidate)) {
    return { kind: "ark", value: candidate.toLowerCase() };
  }
  if (isBolt12Offer(candidate)) {
    return { kind: "bolt12", value: normalizeBolt12Offer(candidate).toLowerCase() };
  }
  return lnurlEndpoint(value) === null ? null : { kind: "lnurl", value };
}

export function isPayoutDestination(value: string): boolean {
  return payoutDestination(value) !== null;
}

export function hasUniquePayoutDestinations(values: readonly (string | null)[]): boolean {
  const destinations = values.flatMap((value) => {
    const destination = value === null ? null : payoutDestination(value);
    if (destination === null) {
      return [];
    }
    return [destination.kind === "lnurl" ? lnurlEndpoint(destination.value) : destination.value];
  });
  return new Set(destinations).size === destinations.length;
}

export const ReceivingAddress = Schema.String.pipe(
  Schema.check(Schema.makeFilter((value) => isPayoutDestination(value) || PAYOUT_DESTINATION_ERROR)),
);
