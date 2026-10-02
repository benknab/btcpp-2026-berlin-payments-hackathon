import { describe, expect, it } from "@effect/vitest";
import { bech32, hex } from "@scure/base";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { Database } from "./database";
import { completeEventSettlement } from "./event-completion";
import { eventPaymentFixture, EventTestDatabase } from "./event-payment-fixture";
import { eventInvoices, eventPayouts } from "./event-payment-schema";
import { claimEventPayout, confirmEventPayout, loadEventPayouts, prepareEventPayout } from "./event-payouts";
import { getGroup } from "./groups";

const PREIMAGE = "0".repeat(64);
const PAYMENT_HASH = "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925";
const WORDS = [
  ...Array.from({ length: 7 }, () => 0),
  1,
  1,
  20,
  ...bech32.toWords(hex.decode(PAYMENT_HASH)),
  ...Array.from({ length: 104 }, () => 0),
];
const INVOICE = bech32.encode("lntbs50u", WORDS, false);

const fundEvent = Effect.fn("fundPayoutFixture")(function* fundEvent(event: {
  readonly groupId: string;
  readonly bobId: string;
}) {
  const database = yield* Database;
  yield* database.insert(eventInvoices).values({
    groupId: event.groupId,
    participantId: event.bobId,
    paymentHash: "1".repeat(64),
    invoice: INVOICE,
    amountSats: 5000,
    expiresAt: 3_600_000,
    deliveredSats: 5000,
    status: "delivered",
  });
});

describe("browser payout coordination", () => {
  it.effect("requires funding and owner access, persists before claiming, and verifies settlement proofs", () =>
    Effect.gen(function* verifyPayout() {
      expect.hasAssertions();
      const event = yield* eventPaymentFixture();
      const input = { inviteKey: event.inviteKey, participantId: event.organizerId, invoice: INVOICE };
      expect(yield* Effect.flip(prepareEventPayout(input, event.organizerToken))).toMatchObject({ _tag: "GroupError" });
      yield* fundEvent(event);
      expect(yield* Effect.flip(prepareEventPayout(input, "wrong-owner"))).toMatchObject({ _tag: "GroupError" });
      expect(
        yield* Effect.flip(
          prepareEventPayout({ ...input, invoice: bech32.encode("lntbs60u", WORDS, false) }, event.organizerToken),
        ),
      ).toMatchObject({ _tag: "GroupError" });
      const payout = yield* prepareEventPayout(input, event.organizerToken);
      expect(payout.status).toBe("prepared");
      expect(yield* prepareEventPayout(input, event.organizerToken)).toStrictEqual(payout);
      const request = { inviteKey: event.inviteKey, paymentHash: payout.paymentHash };
      expect(yield* completeEventSettlement(event.inviteKey, event.organizerToken)).toBe(false);
      expect((yield* claimEventPayout(request, event.organizerToken)).claimed).toBe(true);
      expect((yield* claimEventPayout(request, event.organizerToken)).claimed).toBe(false);
      expect(
        yield* Effect.flip(confirmEventPayout({ ...request, preimage: "1".repeat(64) }, event.organizerToken)),
      ).toMatchObject({ _tag: "GroupError" });
      yield* confirmEventPayout({ ...request, preimage: PREIMAGE }, event.organizerToken);
      yield* confirmEventPayout({ ...request, preimage: PREIMAGE }, event.organizerToken);
      expect(yield* loadEventPayouts(event.inviteKey)).toHaveLength(1);
      expect(yield* completeEventSettlement(event.inviteKey, event.organizerToken)).toBe(true);
      expect((yield* getGroup(event.inviteKey)).group.status).toBe("settled");
    }).pipe(Effect.provide(EventTestDatabase)),
  );

  it.effect("never replaces an in-flight invoice, even after expiry, or ignores excess contributions", () =>
    Effect.gen(function* verifyUnknownOutcome() {
      expect.hasAssertions();
      const event = yield* eventPaymentFixture();
      yield* fundEvent(event);
      const input = { inviteKey: event.inviteKey, participantId: event.organizerId, invoice: INVOICE };
      const payout = yield* prepareEventPayout(input, event.organizerToken);
      const request = { inviteKey: event.inviteKey, paymentHash: payout.paymentHash };
      yield* claimEventPayout(request, event.organizerToken);
      const database = yield* Database;
      yield* database
        .update(eventPayouts)
        .set({ expiresAt: 0 })
        .where(eq(eventPayouts.paymentHash, payout.paymentHash));
      expect((yield* prepareEventPayout(input, event.organizerToken)).status).toBe("sending");
      expect((yield* claimEventPayout(request, event.organizerToken)).claimed).toBe(false);
      yield* confirmEventPayout({ ...request, preimage: PREIMAGE }, event.organizerToken);
      yield* database
        .update(eventInvoices)
        .set({ deliveredSats: 6000 })
        .where(eq(eventInvoices.groupId, event.groupId));
      expect(yield* completeEventSettlement(event.inviteKey, event.organizerToken)).toBe(false);
      expect((yield* getGroup(event.inviteKey)).group.status).toBe("settling");
    }).pipe(Effect.provide(EventTestDatabase)),
  );
});
