import { describe, expect, it } from "@effect/vitest";
import { migrate } from "drizzle-orm/effect-libsql/migrator";
import { Effect } from "effect";

import { Database } from "./database";
import { EventTestDatabase, eventPaymentFixture } from "./event-payment-fixture";
import { lockEventSettlement } from "./event-settlement";
import { previewGroupSettlement } from "./group-settlement-preview";
import { groupSettlementPage, lockGroupSettlement } from "./group-settlements";
import { createGroup } from "./groups";

describe("settlement flow isolation", () => {
  it.effect("does not replace a browser settlement with a managed pot", () =>
    Effect.gen(function* checkBrowser() {
      expect.hasAssertions();
      const event = yield* eventPaymentFixture();
      expect((yield* groupSettlementPage(event.inviteKey)).browserSettlement).toBe(true);
      const preview = yield* previewGroupSettlement(event.inviteKey);
      const result = yield* Effect.flip(
        lockGroupSettlement({
          inviteKey: event.inviteKey,
          organizerToken: event.organizerToken,
          fingerprint: preview.fingerprint,
          walletFingerprint: "another-wallet",
        }),
      );
      expect(result).toMatchObject({ _tag: "GroupError" });
      expect(yield* lockEventSettlement(event.inviteKey, event.organizerToken)).toStrictEqual(event.members);
    }).pipe(Effect.provide(EventTestDatabase)),
  );

  it.effect("does not replace a managed settlement with a browser settlement", () =>
    Effect.gen(function* checkManaged() {
      expect.hasAssertions();
      yield* migrate(yield* Database, { migrationsFolder: "./drizzle" });
      const event = yield* createGroup({
        name: "Empty event",
        organizerName: "Alice",
        participantNames: ["Bob"],
        arkAddress: "ark1ace",
      });
      const preview = yield* previewGroupSettlement(event.inviteKey);
      yield* lockGroupSettlement({
        inviteKey: event.inviteKey,
        organizerToken: event.organizerToken,
        fingerprint: preview.fingerprint,
        walletFingerprint: null,
      });
      expect(yield* Effect.flip(lockEventSettlement(event.inviteKey, event.organizerToken))).toMatchObject({
        _tag: "GroupError",
      });
    }).pipe(Effect.provide(EventTestDatabase)),
  );
});
