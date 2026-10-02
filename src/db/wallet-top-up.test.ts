import { INVOICE, mainnetInvoice } from "@/domain/payout-fixture";
import { Receiver } from "@/server/bark/receiver";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { TestClock } from "effect/testing";

import { Database } from "./database";
import { loadEventInvoices } from "./event-funding";
import { EventTestDatabase, eventPaymentFixture } from "./event-payment-fixture";
import { groups } from "./schema";
import { walletTopUpInvoice } from "./wallet-top-up";

describe("wallet top-up invoices", () => {
  it.effect("targets the stored event wallet without crediting any participant or changing settlement", () =>
    Effect.gen(function* test() {
      const event = yield* eventPaymentFixture();
      const receiver = Receiver.of({
        invoice: (address, amountSats) =>
          Effect.sync(() => {
            expect(address).toBe("ark1ace");
            expect(amountSats).toBe(5000);
            return INVOICE;
          }),
        receipt: () => Effect.die("No contribution receipt expected"),
      });
      const result = yield* walletTopUpInvoice(
        { inviteKey: event.inviteKey, amountSats: 5000 },
        event.organizerToken,
      ).pipe(Effect.provideService(Receiver, receiver));
      expect(result).toMatchObject({ invoice: INVOICE, amountSats: 5000 });
      expect(yield* loadEventInvoices(event.inviteKey)).toStrictEqual([]);
      const database = yield* Database;
      expect(yield* database.select({ status: groups.status }).from(groups)).toStrictEqual([{ status: "settling" }]);
    }).pipe(Effect.provide(EventTestDatabase)),
  );

  it.effect("rejects unauthorized, invalid-amount, and missing-wallet requests before calling Barkd", () =>
    Effect.gen(function* test() {
      const event = yield* eventPaymentFixture();
      const calls = yield* Ref.make(0);
      const receiver = Receiver.of({
        invoice: () => Ref.update(calls, (count) => count + 1).pipe(Effect.as(INVOICE)),
        receipt: () => Effect.die("No receipt expected"),
      });
      const request = Effect.fn(function* request(amountSats: number, token?: string) {
        return yield* walletTopUpInvoice({ inviteKey: event.inviteKey, amountSats }, token).pipe(
          Effect.provideService(Receiver, receiver),
          Effect.result,
        );
      });
      expect(yield* request(5000)).toMatchObject({ _tag: "Failure" });
      expect(yield* request(5000, "wrong-token")).toMatchObject({ _tag: "Failure" });
      expect(yield* request(0, event.organizerToken)).toMatchObject({ _tag: "Failure" });
      expect(yield* request(-1, event.organizerToken)).toMatchObject({ _tag: "Failure" });
      expect(yield* request(1.5, event.organizerToken)).toMatchObject({ _tag: "Failure" });
      const database = yield* Database;
      yield* database.update(groups).set({ arkAddress: null });
      expect(yield* request(5000, event.organizerToken)).toMatchObject({ _tag: "Failure" });
      expect(yield* Ref.get(calls)).toBe(0);
    }).pipe(Effect.provide(EventTestDatabase)),
  );

  it.effect.each(["wrong amount", "expired", "invalid invoice"])("rejects %s from the receiver", (scenario) =>
    Effect.gen(function* test() {
      const event = yield* eventPaymentFixture();
      if (scenario === "expired") {
        yield* TestClock.adjust("2 hours");
      }
      const invoices: Readonly<Record<string, string>> = {
        "wrong amount": mainnetInvoice("60"),
        "expired": INVOICE,
        "invalid invoice": "lntbs-invalid",
      };
      const invoice = invoices[scenario] ?? "";
      const result = yield* walletTopUpInvoice(
        { inviteKey: event.inviteKey, amountSats: 5000 },
        event.organizerToken,
      ).pipe(
        Effect.provideService(
          Receiver,
          Receiver.of({
            invoice: () => Effect.succeed(invoice),
            receipt: () => Effect.die("No receipt expected"),
          }),
        ),
        Effect.result,
      );
      expect(result).toMatchObject({ _tag: "Failure" });
      expect(yield* loadEventInvoices(event.inviteKey)).toStrictEqual([]);
    }).pipe(Effect.provide(EventTestDatabase)),
  );
});
