import { BOLT12_OFFER, INVOICE, MAINNET_ARK_ADDRESS } from "@/domain/payout-fixture";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { Database } from "./database";
import { eventPaymentFixture, EventTestDatabase } from "./event-payment-fixture";
import { eventInvoices, eventPayouts } from "./event-payment-schema";
import { claimEventPayout, loadEventPayouts, prepareEventPayout, releaseUnstartedPayout } from "./event-payouts";
import { saveReceivingAddress } from "./event-receiving-address";

const fixture = Effect.fn("recoveryFixture")(function* fixture(destination: string = BOLT12_OFFER) {
  const event = yield* eventPaymentFixture(destination);
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
  const payout = yield* prepareEventPayout(
    { inviteKey: event.inviteKey, participantId: event.organizerId, destination },
    event.organizerToken,
  );
  const request = {
    inviteKey: event.inviteKey,
    paymentHash: payout.paymentHash,
    historyLastId: 2,
    pendingSendCount: 0 as const,
  };
  return { event, payout, request };
});

describe("release an unstarted BOLT12 payout", () => {
  it.effect("expires only the claimed attempt with matching wallet evidence, allowing address changes", () =>
    Effect.gen(function* test() {
      const { event, request } = yield* fixture();
      expect(yield* Effect.flip(releaseUnstartedPayout(request, event.organizerToken))).toMatchObject({
        _tag: "GroupError",
      });
      yield* claimEventPayout({ ...request, historyStartId: 2 }, event.organizerToken);
      expect(
        yield* Effect.flip(releaseUnstartedPayout({ ...request, pendingSendCount: 1 }, event.organizerToken)),
      ).toMatchObject({ _tag: "GroupError" });
      expect(yield* Effect.flip(releaseUnstartedPayout(request, "wrong-owner"))).toMatchObject({ _tag: "GroupError" });
      expect(
        yield* Effect.flip(releaseUnstartedPayout({ ...request, historyLastId: 3 }, event.organizerToken)),
      ).toMatchObject({ _tag: "GroupError" });
      expect(yield* loadEventPayouts(event.inviteKey)).toMatchObject([{ status: "sending" }]);
      yield* releaseUnstartedPayout(request, event.organizerToken);
      expect(yield* loadEventPayouts(event.inviteKey)).toMatchObject([{ status: "expired" }]);
      yield* saveReceivingAddress(
        { inviteKey: event.inviteKey, participantId: event.organizerId, lnurl: "new@wallet.com" },
        event.organizerToken,
      );
      expect(yield* Effect.flip(claimEventPayout(request, event.organizerToken))).toMatchObject({ _tag: "GroupError" });
    }).pipe(Effect.provide(EventTestDatabase)),
  );

  it.effect.each(["paid", "ark"])("cannot release a %s payout", (kind) =>
    Effect.gen(function* test() {
      const { event, request } = yield* fixture(kind === "ark" ? MAINNET_ARK_ADDRESS : BOLT12_OFFER);
      yield* claimEventPayout({ ...request, historyStartId: 2 }, event.organizerToken);
      if (kind === "paid") {
        const database = yield* Database;
        yield* database.update(eventPayouts).set({ status: "paid" });
      }
      expect(yield* Effect.flip(releaseUnstartedPayout(request, event.organizerToken))).toMatchObject({
        _tag: "GroupError",
      });
      expect(yield* loadEventPayouts(event.inviteKey)).toMatchObject([
        { status: kind === "paid" ? "paid" : "sending" },
      ]);
    }).pipe(Effect.provide(EventTestDatabase)),
  );
});
