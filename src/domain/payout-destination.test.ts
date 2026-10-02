import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { CreateGroupRequest } from "./group-input";
import { hasUniquePayoutDestinations, payoutDestination, ReceivingAddress } from "./payout-destination";
import { BOLT12_OFFER, MAINNET_ARK_ADDRESS, SIGNET_ARK_ADDRESS } from "./payout-fixture";

describe("settlement receiving addresses", () => {
  it.effect.each([
    { value: "alice@wallet.com", kind: "lnurl" },
    { value: MAINNET_ARK_ADDRESS, kind: "ark" },
    { value: MAINNET_ARK_ADDRESS.toUpperCase(), kind: "ark" },
    { value: BOLT12_OFFER, kind: "bolt12" },
    { value: `${BOLT12_OFFER.slice(0, 30)}+\n ${BOLT12_OFFER.slice(30)}`, kind: "bolt12" },
    { value: `lightning:${BOLT12_OFFER.toUpperCase()}`, kind: "bolt12" },
  ])(
    "accepts $kind destinations during creation and settlement",
    ({ value, kind }: Readonly<{ value: string; kind: string }>) =>
      Effect.gen(function* validate() {
        expect.hasAssertions();
        expect(yield* Schema.decodeUnknownEffect(ReceivingAddress)(value)).toBe(value);
        expect(payoutDestination(value)?.kind).toBe(kind);
        const group = yield* Schema.decodeUnknownEffect(CreateGroupRequest)({
          name: "Dinner",
          organizerName: "Alice",
          participantNames: ["Bob"],
          participantLnurls: [value],
          arkAddress: "ark1ace",
        });
        expect(group.participantLnurls).toStrictEqual([value]);
      }),
  );

  it.effect.each([
    "ark1ace",
    SIGNET_ARK_ADDRESS,
    MAINNET_ARK_ADDRESS.slice(0, -1),
    ` ${MAINNET_ARK_ADDRESS}`,
    MAINNET_ARK_ADDRESS.replace("ark1", "tark1"),
    "lno1",
    "lno1qqqq",
    BOLT12_OFFER.slice(0, -3),
    BOLT12_OFFER.replace("lno1", "lni1"),
    "lnbc1invalid",
    "invalid",
  ])("rejects malformed or unsupported destinations: %s", (value) =>
    Effect.gen(function* reject() {
      expect.hasAssertions();
      expect(yield* Effect.flip(Schema.decodeUnknownEffect(ReceivingAddress)(value))).toMatchObject({
        _tag: "SchemaError",
      });
    }),
  );

  it.effect("normalizes native destinations for duplicate detection", () =>
    Effect.sync(() => {
      expect.hasAssertions();
      expect(hasUniquePayoutDestinations([MAINNET_ARK_ADDRESS, MAINNET_ARK_ADDRESS.toUpperCase()])).toBe(false);
      expect(hasUniquePayoutDestinations([BOLT12_OFFER, `lightning:${BOLT12_OFFER.toUpperCase()}`])).toBe(false);
      expect(hasUniquePayoutDestinations([null, "alice@wallet.com", MAINNET_ARK_ADDRESS, BOLT12_OFFER])).toBe(true);
    }),
  );
});
