import { BOLT12_OFFER, INVOICE, MAINNET_ARK_ADDRESS } from "@/domain/payout-fixture";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { Database } from "./database";
import { eventPaymentFixture, EventTestDatabase } from "./event-payment-fixture";
import { eventInvoices, eventPayouts } from "./event-payment-schema";
import { claimEventPayout, loadEventPayouts, prepareEventPayout } from "./event-payouts";
import { saveReceivingAddress } from "./event-receiving-address";
import { loadEventSettlement } from "./event-settlement";
import { createGroup, getGroup } from "./groups";

const fundedEvent = Effect.fn("addressChangeFixture")(function* fundedEvent() {
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
  return event;
});

describe("settlement receiving address changes", () => {
  it.effect("lets invitees save only their selected destination before locking", () =>
    Effect.gen(function* verifyInviteeAddress() {
      yield* eventPaymentFixture();
      const event = yield* createGroup({
        name: "Trip",
        organizerName: "Alice",
        organizerLnurl: "alice@wallet.com",
        participantNames: ["Bob", "Carol"],
        arkAddress: "ark1ace",
      });
      const guests = (yield* getGroup(event.inviteKey)).participants.filter((member) => member.position > 0);
      const [bob, carol] = guests;
      if (bob === undefined || carol === undefined) {
        yield* Effect.die("Missing guests");
        return;
      }
      const input = { inviteKey: event.inviteKey, participantId: bob.id, lnurl: "bob@wallet.com" };
      expect(yield* Effect.flip(saveReceivingAddress(input))).toMatchObject({ _tag: "GroupError" });
      expect(yield* Effect.flip(saveReceivingAddress(input, undefined, carol.id))).toMatchObject({
        _tag: "GroupError",
      });
      expect(yield* Effect.flip(saveReceivingAddress(input, event.organizerToken))).toMatchObject({
        _tag: "GroupError",
      });
      yield* saveReceivingAddress(input, undefined, bob.id);
      expect((yield* getGroup(event.inviteKey)).participants.find((member) => member.id === bob.id)?.lnurl).toBe(
        "bob@wallet.com",
      );
      expect(
        yield* Effect.flip(
          saveReceivingAddress({ ...input, participantId: event.organizerId }, undefined, event.organizerId),
        ),
      ).toMatchObject({ _tag: "GroupError" });
      yield* saveReceivingAddress({ ...input, participantId: carol.id }, undefined, carol.id);
      expect((yield* getGroup(event.inviteKey)).participants.find((member) => member.id === carol.id)?.lnurl).toBe(
        "bob@wallet.com",
      );
    }).pipe(Effect.provide(EventTestDatabase)),
  );
  it.effect("invalidates an unsent invoice and rejects stale preparation and claim requests", () =>
    Effect.gen(function* test() {
      const event = yield* fundedEvent();
      const input = {
        inviteKey: event.inviteKey,
        participantId: event.organizerId,
        destination: "alice@wallet.com",
        invoice: INVOICE,
      };
      const old = yield* prepareEventPayout(input, event.organizerToken);
      yield* saveReceivingAddress({ ...input, lnurl: MAINNET_ARK_ADDRESS }, event.organizerToken);
      expect(yield* loadEventPayouts(event.inviteKey)).toMatchObject([
        { paymentHash: old.paymentHash, status: "expired" },
      ]);
      expect(
        yield* Effect.flip(
          claimEventPayout({ inviteKey: event.inviteKey, paymentHash: old.paymentHash }, event.organizerToken),
        ),
      ).toMatchObject({ _tag: "GroupError" });
      expect(yield* Effect.flip(prepareEventPayout(input, event.organizerToken))).toMatchObject({ _tag: "GroupError" });
      const next = yield* prepareEventPayout(
        { inviteKey: event.inviteKey, participantId: event.organizerId, destination: MAINNET_ARK_ADDRESS },
        event.organizerToken,
      );
      expect(next).toMatchObject({ method: "ark", invoice: MAINNET_ARK_ADDRESS, amountSats: 5000, status: "prepared" });
      expect(
        (yield* loadEventSettlement(event.inviteKey))?.find((member) => member.participantId === event.organizerId),
      ).toMatchObject({ lnurl: MAINNET_ARK_ADDRESS, receiveSats: 5000 });
      const database = yield* Database;
      expect(yield* database.select().from(eventInvoices)).toMatchObject([
        { status: "delivered", deliveredSats: 5000 },
      ]);
    }).pipe(Effect.provide(EventTestDatabase)),
  );

  it.effect.each(["sending", "paid"] as const)("rejects changes to a %s payout atomically", (status) =>
    Effect.gen(function* test() {
      const event = yield* fundedEvent();
      yield* prepareEventPayout(
        {
          inviteKey: event.inviteKey,
          participantId: event.organizerId,
          destination: "alice@wallet.com",
          invoice: INVOICE,
        },
        event.organizerToken,
      );
      const database = yield* Database;
      yield* database.update(eventPayouts).set({ status });
      expect(
        yield* Effect.flip(
          saveReceivingAddress(
            { inviteKey: event.inviteKey, participantId: event.organizerId, lnurl: "new@wallet.com" },
            event.organizerToken,
          ),
        ),
      ).toMatchObject({ _tag: "GroupError" });
      expect(
        (yield* getGroup(event.inviteKey)).participants.find((member) => member.id === event.organizerId)?.lnurl,
      ).toBe("alice@wallet.com");
      expect(
        (yield* loadEventSettlement(event.inviteKey))?.find((member) => member.participantId === event.organizerId)
          ?.lnurl,
      ).toBe("alice@wallet.com");
      expect(yield* loadEventPayouts(event.inviteKey)).toMatchObject([{ status }]);
    }).pipe(Effect.provide(EventTestDatabase)),
  );

  it.effect.each(["new@wallet.com", MAINNET_ARK_ADDRESS, BOLT12_OFFER])(
    "requires the selected identity and allows a shared destination during settlement: %s",
    (lnurl) =>
      Effect.gen(function* test() {
        const event = yield* fundedEvent();
        const input = { inviteKey: event.inviteKey, participantId: event.organizerId, lnurl };
        expect(yield* Effect.flip(saveReceivingAddress(input, "wrong-token"))).toMatchObject({ _tag: "GroupError" });
        expect(
          yield* Effect.flip(saveReceivingAddress({ ...input, participantId: event.bobId }, event.organizerToken)),
        ).toMatchObject({ _tag: "GroupError" });
        yield* saveReceivingAddress({ ...input, participantId: event.bobId }, undefined, event.bobId);
        yield* saveReceivingAddress(input, event.organizerToken);
        expect((yield* getGroup(event.inviteKey)).participants.map((member) => member.lnurl)).toStrictEqual([
          lnurl,
          lnurl,
        ]);
        expect(
          (yield* loadEventSettlement(event.inviteKey))?.find((member) => member.participantId === event.organizerId)
            ?.lnurl,
        ).toBe(lnurl);
      }).pipe(Effect.provide(EventTestDatabase)),
  );
});
