import { INVOICE } from "@/domain/payout-fixture";
import { Receiver } from "@/server/bark/receiver";
import { describe, expect, it } from "@effect/vitest";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect, Ref } from "effect";

import { Database } from "./database";
import { EventTestDatabase } from "./event-payment-fixture";
import { createGroup } from "./groups";
import { eventInvoices, eventSettlements, expenses, groups } from "./schema";
import { walletTopUpInvoice } from "./wallet-top-up";

describe("early owner fee reserve", () => {
  it.effect("creates and reuses a reserve invoice immediately after creation without locking expenses", () =>
    Effect.gen(function* earlyReserve() {
      const database = yield* Database;
      yield* migrate(database, { migrationsFolder: "./drizzle" });
      const event = yield* createGroup({
        name: "Early reserve",
        organizerName: "Alice",
        organizerLnurl: "alice@wallet.com",
        participantNames: ["Bob"],
        arkAddress: "ark1ace",
      });
      const calls = yield* Ref.make(0);
      const receiver = Receiver.of({
        invoice: (address, amountSats) =>
          Effect.gen(function* invoice() {
            expect(address).toBe("ark1ace");
            expect(amountSats).toBe(5000);
            yield* Ref.update(calls, (count) => count + 1);
            return INVOICE;
          }),
        receipt: (paymentHash) => Effect.succeed({ paymentHash, amountSat: 5000, state: "awaiting-payment" }),
      });
      const request = walletTopUpInvoice({ inviteKey: event.inviteKey, amountSats: 5000 }, event.organizerToken).pipe(
        Effect.provideService(Receiver, receiver),
      );
      const first = yield* request;
      expect((yield* request).paymentHash).toBe(first.paymentHash);
      expect(yield* Ref.get(calls)).toBe(1);
      expect(yield* database.select().from(eventInvoices)).toMatchObject([
        { participantId: event.organizerId, purpose: "fee-reserve", status: "pending", deliveredSats: 0 },
      ]);
      expect(yield* database.select({ status: groups.status }).from(groups)).toStrictEqual([{ status: "open" }]);
      expect(yield* database.select().from(eventSettlements)).toStrictEqual([]);
      expect(yield* database.select().from(expenses)).toStrictEqual([]);
    }).pipe(Effect.provide(EventTestDatabase)),
  );
});
