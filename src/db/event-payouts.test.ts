import {
  BOLT12_OFFER,
  MAINNET_ARK_ADDRESS,
  PREIMAGE,
  PAYMENT_HASH,
  INVOICE,
  mainnetInvoice,
} from "@/domain/payout-fixture";
import { describe, expect, it } from "@effect/vitest";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { Database } from "./database";
import { completeEventSettlement } from "./event-completion";
import { eventPaymentFixture, EventTestDatabase } from "./event-payment-fixture";
import { eventInvoices, eventPayouts } from "./event-payment-schema";
import { claimEventPayout, confirmEventPayout, loadEventPayouts, prepareEventPayout } from "./event-payouts";
import { getGroup } from "./groups";

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
  it.effect.each([
    { destination: MAINNET_ARK_ADDRESS, method: "ark" },
    { destination: BOLT12_OFFER, method: "bolt12" },
  ])(
    "persists and reconciles $method payouts without replacing unknown attempts",
    ({ destination, method }: Readonly<{ destination: string; method: string }>) =>
      Effect.gen(function* verifyNativePayout() {
        expect.hasAssertions();
        const event = yield* eventPaymentFixture(destination);
        const input = { inviteKey: event.inviteKey, participantId: event.organizerId, destination };
        expect(yield* Effect.flip(prepareEventPayout(input, event.organizerToken))).toMatchObject({
          _tag: "GroupError",
        });
        yield* fundEvent(event);
        expect(yield* Effect.flip(prepareEventPayout(input, "wrong-owner"))).toMatchObject({ _tag: "GroupError" });
        expect(
          yield* Effect.flip(prepareEventPayout({ ...input, invoice: INVOICE }, event.organizerToken)),
        ).toMatchObject({ _tag: "GroupError" });
        const payout = yield* prepareEventPayout(input, event.organizerToken);
        expect(payout).toMatchObject({ method, invoice: destination, amountSats: 5000, status: "prepared" });
        const request = { inviteKey: event.inviteKey, paymentHash: payout.paymentHash };
        expect(yield* Effect.flip(claimEventPayout(request, event.organizerToken))).toMatchObject({
          _tag: "GroupError",
        });
        expect((yield* claimEventPayout({ ...request, historyStartId: 10 }, event.organizerToken)).claimed).toBe(true);
        expect(
          (yield* claimEventPayout({ ...request, historyStartId: 20 }, event.organizerToken)).payout.historyStartId,
        ).toBe(10);
        expect((yield* prepareEventPayout(input, event.organizerToken)).status).toBe("sending");
        const movement = {
          id: 11,
          status: "successful",
          intendedBalanceSats: -5000,
          sentToAddresses: method === "ark" ? [JSON.stringify({ type: "ark", value: destination })] : [],
          ...(method === "bolt12" ? { lightningOffer: destination, paymentHash: PAYMENT_HASH } : {}),
        };
        const proof = { ...request, movement, ...(method === "bolt12" ? { preimage: PREIMAGE } : {}) };
        for (const invalid of [
          { ...proof, movement: { ...movement, id: 10 } },
          { ...proof, movement: { ...movement, status: "pending" } },
          { ...proof, movement: { ...movement, intendedBalanceSats: -6000 } },
          { ...proof, movement: { ...movement, sentToAddresses: ["wrong"], lightningOffer: "wrong" } },
        ]) {
          expect(yield* Effect.flip(confirmEventPayout(invalid, event.organizerToken))).toMatchObject({
            _tag: "GroupError",
          });
        }
        if (method === "bolt12") {
          expect(
            yield* Effect.flip(confirmEventPayout({ ...proof, preimage: "1".repeat(64) }, event.organizerToken)),
          ).toMatchObject({ _tag: "GroupError" });
        }
        expect(yield* completeEventSettlement(event.inviteKey, event.organizerToken)).toBe(false);
        yield* confirmEventPayout(proof, event.organizerToken);
        yield* confirmEventPayout(proof, event.organizerToken);
        expect((yield* loadEventPayouts(event.inviteKey))[0]).toMatchObject({ status: "paid", movementId: 11 });
        expect(yield* completeEventSettlement(event.inviteKey, event.organizerToken)).toBe(true);
      }).pipe(Effect.provide(EventTestDatabase)),
  );
  it.effect("requires funding and owner access, persists before claiming, and verifies settlement proofs", () =>
    Effect.gen(function* verifyPayout() {
      expect.hasAssertions();
      const event = yield* eventPaymentFixture();
      const input = {
        inviteKey: event.inviteKey,
        participantId: event.organizerId,
        destination: "alice@wallet.com",
        invoice: INVOICE,
      };
      expect(yield* Effect.flip(prepareEventPayout(input, event.organizerToken))).toMatchObject({ _tag: "GroupError" });
      yield* fundEvent(event);
      expect(yield* Effect.flip(prepareEventPayout(input, "wrong-owner"))).toMatchObject({ _tag: "GroupError" });
      expect(
        yield* Effect.flip(prepareEventPayout({ ...input, invoice: mainnetInvoice("60") }, event.organizerToken)),
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
      const input = {
        inviteKey: event.inviteKey,
        participantId: event.organizerId,
        destination: "alice@wallet.com",
        invoice: INVOICE,
      };
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
