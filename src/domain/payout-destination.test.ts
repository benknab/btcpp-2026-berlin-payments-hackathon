import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { CreateGroupRequest } from "./group-input";
import { hasUniquePayoutDestinations, payoutDestination, ReceivingAddress } from "./payout-destination";
import { BOLT12_OFFER, SIGNET_ARK_ADDRESS } from "./payout-fixture";

describe("settlement receiving addresses", () => {
  it.effect.each([
    { value: "alice@wallet.com", kind: "lnurl" },
    { value: SIGNET_ARK_ADDRESS, kind: "ark" },
    { value: SIGNET_ARK_ADDRESS.toUpperCase(), kind: "ark" },
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
          arkAddress: "tark1ace",
        });
        expect(group.participantLnurls).toStrictEqual([value]);
      }),
  );

  it.effect.each([
    "tark1ace",
    SIGNET_ARK_ADDRESS.slice(0, -1),
    ` ${SIGNET_ARK_ADDRESS}`,
    SIGNET_ARK_ADDRESS.replace("tark1", "ark1"),
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
      expect(hasUniquePayoutDestinations([SIGNET_ARK_ADDRESS, SIGNET_ARK_ADDRESS.toUpperCase()])).toBe(false);
      expect(hasUniquePayoutDestinations([BOLT12_OFFER, `lightning:${BOLT12_OFFER.toUpperCase()}`])).toBe(false);
      expect(hasUniquePayoutDestinations([null, "alice@wallet.com", SIGNET_ARK_ADDRESS, BOLT12_OFFER])).toBe(true);
    }),
  );
});
