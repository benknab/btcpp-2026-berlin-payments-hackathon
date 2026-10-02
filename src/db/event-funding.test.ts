import { isEventFunded } from "@/domain/event-funding";
import { Receiver } from "@/server/bark/receiver";
import { describe, expect, it } from "@effect/vitest";
import { bech32 } from "@scure/base";
import { eq } from "drizzle-orm";
import { Effect, Ref } from "effect";

import { Database } from "./database";
import { contributionInvoice, loadEventInvoices, reconcileEventInvoices } from "./event-funding";
import { EventTestDatabase, eventPaymentFixture } from "./event-payment-fixture";
import { eventInvoices, groups } from "./schema";

const INVOICE = bech32.encode(
  "lntbs50u",
  [
    ...Array.from({ length: 7 }, () => 0),
    1,
    1,
    20,
    ...bech32.toWords(new Uint8Array(32)),
    ...Array.from({ length: 104 }, () => 0),
  ],
  false,
);

describe("event contributions", () => {
  it.effect("reopens completed events when an expired attempt is delivered late", () =>
    Effect.gen(function* verifyLateReceipt() {
      expect.hasAssertions();
      const event = yield* eventPaymentFixture();
      const database = yield* Database;
      yield* database.insert(eventInvoices).values({
        groupId: event.groupId,
        participantId: event.bobId,
        paymentHash: "2".repeat(64),
        invoice: INVOICE,
        amountSats: 5000,
        expiresAt: 0,
        status: "expired",
      });
      yield* database.update(groups).set({ status: "settled" }).where(eq(groups.id, event.groupId));
      const receiver = Receiver.of({
        invoice: () => Effect.die("No new invoice expected"),
        receipt: (paymentHash) => Effect.succeed({ paymentHash, amountSat: 5000, state: "settled" }),
      });
      const refresh = reconcileEventInvoices(event.inviteKey).pipe(Effect.provideService(Receiver, receiver));
      expect((yield* refresh)[0]?.deliveredSats).toBe(5000);
      expect(
        yield* database.select({ status: groups.status }).from(groups).where(eq(groups.id, event.groupId)),
      ).toStrictEqual([{ status: "settling" }]);
      yield* database.update(groups).set({ status: "settled" }).where(eq(groups.id, event.groupId));
      yield* refresh;
      expect(
        yield* database.select({ status: groups.status }).from(groups).where(eq(groups.id, event.groupId)),
      ).toStrictEqual([{ status: "settled" }]);
    }).pipe(Effect.provide(EventTestDatabase)),
  );

  it.effect("reuses invoices and only credits delivered receipts once", () =>
    Effect.gen(function* verifyReceipts() {
      expect.hasAssertions();
      const event = yield* eventPaymentFixture();
      const state = yield* Ref.make<"awaiting-payment" | "delivering" | "settled">("awaiting-payment");
      const calls = yield* Ref.make(0);
      const receiver = Receiver.of({
        invoice: (address, amount) =>
          Effect.gen(function* invoice() {
            expect(address).toBe("tark1ace");
            expect(amount).toBe(5000);
            yield* Ref.update(calls, (count) => count + 1);
            return INVOICE;
          }),
        receipt: (paymentHash) =>
          Ref.get(state).pipe(Effect.map((value) => ({ paymentHash, amountSat: 5000, state: value }))),
      });
      const request = contributionInvoice(event.inviteKey, event.bobId).pipe(Effect.provideService(Receiver, receiver));
      const first = yield* request;
      expect(yield* request).toStrictEqual(first);
      expect(yield* Ref.get(calls)).toBe(1);
      const refresh = reconcileEventInvoices(event.inviteKey).pipe(Effect.provideService(Receiver, receiver));
      yield* Ref.set(state, "delivering");
      const paid = yield* refresh;
      expect(paid[0]?.status).toBe("paid");
      expect(isEventFunded(event.members, paid)).toBe(false);
      yield* Ref.set(state, "settled");
      const delivered = yield* refresh;
      expect(delivered[0]?.deliveredSats).toBe(5000);
      expect(isEventFunded(event.members, delivered)).toBe(true);
      expect(yield* refresh).toStrictEqual(delivered);
      expect((yield* Effect.flip(request))._tag).toBe("GroupError");
      expect(yield* loadEventInvoices(event.inviteKey)).toHaveLength(1);
    }).pipe(Effect.provide(EventTestDatabase)),
  );
});
