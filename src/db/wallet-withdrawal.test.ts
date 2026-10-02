import { INVOICE } from "@/domain/payout-fixture";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { Database } from "./database";
import { EventTestDatabase, eventPaymentFixture } from "./event-payment-fixture";
import { eventInvoices, eventPayouts, groups } from "./schema";
import { authorizeWalletWithdrawal } from "./wallet-withdrawal";

const settledEvent = Effect.fn("withdrawalFixture")(function* settledEvent() {
  const event = yield* eventPaymentFixture();
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
  yield* database.insert(eventPayouts).values({
    groupId: event.groupId,
    participantId: event.organizerId,
    paymentHash: "2".repeat(64),
    invoice: INVOICE,
    amountSats: 5000,
    expiresAt: 3_600_000,
    status: "paid",
  });
  yield* database.update(groups).set({ status: "settled" });
  return event;
});

describe("leftover withdrawal authorization", () => {
  it.effect("allows only the organizer of a completed browser-wallet settlement", () =>
    Effect.gen(function* test() {
      const event = yield* settledEvent();
      expect(yield* Effect.flip(authorizeWalletWithdrawal(event.inviteKey, "wrong-owner"))).toMatchObject({
        _tag: "GroupError",
      });
      expect(yield* authorizeWalletWithdrawal(event.inviteKey, event.organizerToken)).toStrictEqual({
        arkAddress: "ark1ace",
      });
      const database = yield* Database;
      yield* database.update(groups).set({ status: "settling" });
      expect(yield* Effect.flip(authorizeWalletWithdrawal(event.inviteKey, event.organizerToken))).toMatchObject({
        _tag: "GroupError",
      });
    }).pipe(Effect.provide(EventTestDatabase)),
  );

  it.effect.each(["unpaid", "excess", "pending contribution"])(
    "rejects %s even if group status says settled",
    (scenario) =>
      Effect.gen(function* test() {
        const event = yield* settledEvent();
        const database = yield* Database;
        if (scenario === "unpaid") {
          yield* database.update(eventPayouts).set({ status: "sending" });
        } else if (scenario === "excess") {
          yield* database.update(eventInvoices).set({ deliveredSats: 6000 });
        } else {
          yield* database.update(eventInvoices).set({ status: "paid" });
        }
        expect(yield* Effect.flip(authorizeWalletWithdrawal(event.inviteKey, event.organizerToken))).toMatchObject({
          _tag: "GroupError",
        });
      }).pipe(Effect.provide(EventTestDatabase)),
  );
});
