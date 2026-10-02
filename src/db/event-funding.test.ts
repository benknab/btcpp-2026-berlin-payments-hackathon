import { isEventFunded } from "@/domain/event-funding";
import { Receiver } from "@/server/bark/receiver";
import { describe, expect, it } from "@effect/vitest";
import { bech32 } from "@scure/base";
import { Effect, Ref } from "effect";

import { contributionInvoice, loadEventInvoices, reconcileEventInvoices } from "./event-funding";
import { EventTestDatabase, eventPaymentFixture } from "./event-payment-fixture";

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
